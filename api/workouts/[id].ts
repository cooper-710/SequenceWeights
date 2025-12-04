import { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseClient } from '../_helpers/supabase.js';
import { handleCors, setCorsHeaders } from '../_helpers/cors.js';
import { getWorkoutWithBlocks } from './_helpers.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  setCorsHeaders(res);

  const supabase = getSupabaseClient();
  const { id: workoutId } = req.query;

  if (!workoutId || typeof workoutId !== 'string') {
    return res.status(400).json({ error: 'Workout ID is required' });
  }

  try {
    if (req.method === 'GET') {
      const workout = await getWorkoutWithBlocks(supabase, workoutId);

      if (!workout) {
        return res.status(404).json({ error: 'Workout not found' });
      }

      res.json(workout);
    } else if (req.method === 'PUT') {
      // Update workout
      const workout = req.body;
      const { name, date, athleteId, teamId, blocks } = workout;

      // Check if workout exists
      const { data: existingWorkout, error: checkError } = await supabase
        .from('workouts')
        .select('id')
        .eq('id', workoutId)
        .single();

      if (checkError || !existingWorkout) {
        return res.status(404).json({ error: 'Workout not found' });
      }

      // Update workout basic info
      const { error: updateError } = await supabase
        .from('workouts')
        .update({
          name,
          date,
          athlete_id: athleteId || null,
          team_id: teamId || null,
        })
        .eq('id', workoutId);

      if (updateError) throw updateError;

      // Delete existing blocks (cascade will delete exercises)
      const { error: deleteBlocksError } = await supabase
        .from('blocks')
        .delete()
        .eq('workout_id', workoutId);

      if (deleteBlocksError) throw deleteBlocksError;

      // Insert new blocks and exercises
      if (blocks && blocks.length > 0) {
        for (let blockIndex = 0; blockIndex < blocks.length; blockIndex++) {
          const block = blocks[blockIndex];
          const blockId = `${workoutId}_block_${blockIndex}`;

          const { error: blockError } = await supabase
            .from('blocks')
            .insert({
              id: blockId,
              workout_id: workoutId,
              name: block.name,
              order_index: blockIndex,
            });

          if (blockError) throw blockError;

          if (block.exercises && block.exercises.length > 0) {
            const exercisesToInsert = block.exercises.map((exercise: any, exerciseIndex: number) => ({
              id: `${blockId}_ex_${exerciseIndex}`,
              block_id: blockId,
              exercise_name: exercise.exerciseName,
              sets: exercise.sets,
              reps: exercise.reps,
              weight: exercise.weight || null,
              order_index: exerciseIndex,
            }));

            const { error: exercisesError } = await supabase
              .from('block_exercises')
              .insert(exercisesToInsert);

            if (exercisesError) throw exercisesError;
          }
        }
      }

      // Fetch and return updated workout
      const updatedWorkout = await getWorkoutWithBlocks(supabase, workoutId);
      if (!updatedWorkout) {
        throw new Error('Failed to retrieve updated workout');
      }

      res.json(updatedWorkout);
    } else if (req.method === 'DELETE') {
      // Delete workout (cascade will delete blocks and exercises)
      const { error } = await supabase
        .from('workouts')
        .delete()
        .eq('id', workoutId);

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({ error: 'Workout not found' });
        }
        throw error;
      }

      res.status(204).end();
    } else {
      res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
      res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error: any) {
    console.error('Error in workout API:', error);
    res.status(500).json({ error: error.message || 'Failed to process request' });
  }
}
