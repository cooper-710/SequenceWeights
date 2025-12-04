import { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseClient } from '../_helpers/supabase';
import { handleCors, setCorsHeaders } from '../_helpers/cors';
import { getWorkoutWithBlocks } from './_helpers';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  setCorsHeaders(res);

  const supabase = getSupabaseClient();

  try {
    if (req.method === 'GET') {
      const { athleteId, teamId, templatesOnly } = req.query;

      let query = supabase.from('workouts').select('*');

      if (templatesOnly === 'true') {
        query = query.is('athlete_id', null).is('team_id', null);
      } else {
        if (athleteId && typeof athleteId === 'string') {
          // Get workouts directly assigned to athlete OR workouts from teams the athlete belongs to
          const { data: teamAthletes } = await supabase
            .from('team_athletes')
            .select('team_id')
            .eq('athlete_id', athleteId);

          const teamIds = (teamAthletes || []).map((ta: any) => ta.team_id);

          if (teamIds.length > 0) {
            query = query.or(`athlete_id.eq.${athleteId},team_id.in.(${teamIds.join(',')})`);
          } else {
            query = query.eq('athlete_id', athleteId);
          }
        }

        if (teamId && typeof teamId === 'string') {
          query = query.eq('team_id', teamId);
        }
      }

      query = query.order('date', { ascending: false });

      const { data: workouts, error } = await query;

      if (error) throw error;

      const workoutsWithBlocks = await Promise.all(
        (workouts || []).map((workout: any) => getWorkoutWithBlocks(supabase, workout.id))
      );

      res.json(workoutsWithBlocks.filter(Boolean));
    } else if (req.method === 'POST') {
      // Create new workout
      const workout = req.body;
      const { name, date, athleteId, teamId, blocks } = workout;

      if (!name || !date) {
        return res.status(400).json({ error: 'Name and date are required' });
      }

      const workoutId = Date.now().toString();

      // Insert workout
      const { data: newWorkout, error: workoutError } = await supabase
        .from('workouts')
        .insert({
          id: workoutId,
          name,
          date,
          athlete_id: athleteId || null,
          team_id: teamId || null,
        })
        .select()
        .single();

      if (workoutError) throw workoutError;

      // Insert blocks and exercises
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

      // Fetch and return the created workout
      const createdWorkout = await getWorkoutWithBlocks(supabase, workoutId);
      if (!createdWorkout) {
        throw new Error('Failed to retrieve created workout');
      }

      res.status(201).json(createdWorkout);
    } else {
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error: any) {
    console.error('Error in workouts API:', error);
    res.status(500).json({ error: error.message || 'Failed to process request' });
  }
}
