import { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseClient } from '../_helpers/supabase.js';
import { handleCors, setCorsHeaders } from '../_helpers/cors.js';
import { getWorkoutWithBlocks } from './_helpers.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log(`[Workouts ID] ${req.method} ${req.url}`, { query: req.query, method: req.method });
  
  if (handleCors(req, res)) return;
  setCorsHeaders(res);

  const supabase = getSupabaseClient();
  const { id: workoutId } = req.query;

  if (!workoutId || typeof workoutId !== 'string') {
    return res.status(400).json({ error: 'Workout ID is required' });
  }

  // Check if this is a nested route (has additional path segments)
  // URL format: /api/workouts/{id}/completion or /api/workouts/{id}/exercises/{exerciseId}/sets
  const urlPath = req.url?.split('?')[0] || '';
  const parts = urlPath.split('/').filter(p => p);
  const workoutsIndex = parts.indexOf('workouts');
  
  // If there are more segments after the workout ID, handle nested routes
  if (workoutsIndex >= 0 && parts.length > workoutsIndex + 2) {
    const slugArray = parts.slice(workoutsIndex + 2);
    console.log('Detected nested route:', { workoutId, slugArray, url: req.url });
    return handleNestedRoute(req, res, supabase, workoutId, slugArray);
  }

  // Otherwise, handle standard workout CRUD operations
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

// Handle nested routes (completion, exercises/{id}/sets, exercises/{id}/notes)
async function handleNestedRoute(
  req: VercelRequest,
  res: VercelResponse,
  supabase: any,
  workoutId: string,
  slugArray: string[]
) {
  console.log('Handling nested route:', { workoutId, slugArray, method: req.method });

  const isCompletion = slugArray[0] === 'completion';
  const isSets = slugArray.includes('sets');
  const isNotes = slugArray.includes('notes');
  const exerciseIdIndex = slugArray.indexOf('exercises');
  const exerciseId = exerciseIdIndex >= 0 && exerciseIdIndex < slugArray.length - 1
    ? slugArray[exerciseIdIndex + 1]
    : null;

  try {
    // Handle completion route: GET /api/workouts/{id}/completion
    if (isCompletion && req.method === 'GET') {
      const { athleteId } = req.query;

      if (!athleteId || typeof athleteId !== 'string') {
        return res.status(400).json({ error: 'athleteId query parameter is required' });
      }

      // Get all exercises in the workout
      const { data: blocks, error: blocksError } = await supabase
        .from('blocks')
        .select('*')
        .eq('workout_id', workoutId)
        .order('order_index', { ascending: true });

      if (blocksError) throw blocksError;

      const completionStatus: Record<string, any> = {};

      for (const block of blocks || []) {
        const { data: exercises, error: exercisesError } = await supabase
          .from('block_exercises')
          .select('*')
          .eq('block_id', block.id)
          .order('order_index', { ascending: true });

        if (exercisesError) throw exercisesError;

        for (const exercise of exercises || []) {
          // Get completion data for this exercise
          const { data: completedSetsData, error: countError } = await supabase
            .from('exercise_sets')
            .select('*', { count: 'exact', head: false })
            .eq('block_exercise_id', exercise.id)
            .eq('workout_id', workoutId)
            .eq('athlete_id', athleteId)
            .eq('completed', 1);

          if (countError) throw countError;

          const totalSets = exercise.sets;
          const completedCount = completedSetsData?.length || 0;

          let status: 'completed' | 'in-progress' | 'not-started' = 'not-started';
          if (completedCount === totalSets && totalSets > 0) {
            status = 'completed';
          } else if (completedCount > 0) {
            status = 'in-progress';
          }

          completionStatus[exercise.exercise_name] = {
            status,
            completedSets: completedCount,
            totalSets,
          };
        }
      }

      return res.json(completionStatus);
    }
    // Handle sets route: GET/POST /api/workouts/{id}/exercises/{exerciseId}/sets
    else if (isSets && exerciseId) {
      if (req.method === 'POST') {
        // Save exercise sets
        const { athleteId, sets } = req.body;

        if (!athleteId || !sets || !Array.isArray(sets)) {
          return res.status(400).json({ error: 'athleteId and sets array are required' });
        }

        // Verify workout and exercise exist
        const { data: workout, error: workoutError } = await supabase
          .from('workouts')
          .select('id')
          .eq('id', workoutId)
          .single();

        if (workoutError || !workout) {
          return res.status(404).json({ error: 'Workout not found' });
        }

        const { data: exercise, error: exerciseError } = await supabase
          .from('block_exercises')
          .select('id')
          .eq('id', exerciseId)
          .single();

        if (exerciseError || !exercise) {
          return res.status(404).json({ error: 'Exercise not found' });
        }

        // Delete existing sets for this exercise/athlete/workout combination
        await supabase
          .from('exercise_sets')
          .delete()
          .eq('block_exercise_id', exerciseId)
          .eq('workout_id', workoutId)
          .eq('athlete_id', athleteId);

        // Insert new sets
        const setsToInsert = sets.map((set: any) => ({
          id: `${exerciseId}_${athleteId}_${set.set}`,
          block_exercise_id: exerciseId,
          workout_id: workoutId,
          athlete_id: athleteId,
          set_number: set.set,
          weight: set.weight || null,
          reps: set.reps || null,
          completed: set.completed ? 1 : 0,
          completed_at: set.completed ? new Date().toISOString() : null,
        }));

        const { error: insertError } = await supabase
          .from('exercise_sets')
          .insert(setsToInsert);

        if (insertError) throw insertError;

        return res.json({ success: true, message: 'Sets saved successfully' });
      } else if (req.method === 'GET') {
        // Get exercise sets for an athlete
        const { athleteId } = req.query;

        if (!athleteId || typeof athleteId !== 'string') {
          return res.status(400).json({ error: 'athleteId query parameter is required' });
        }

        const { data: savedSets, error } = await supabase
          .from('exercise_sets')
          .select('*')
          .eq('block_exercise_id', exerciseId)
          .eq('workout_id', workoutId)
          .eq('athlete_id', athleteId)
          .order('set_number', { ascending: true });

        if (error) throw error;

        const sets = (savedSets || []).map((s: any) => ({
          set: s.set_number,
          weight: s.weight || '',
          reps: s.reps || '',
          completed: s.completed === 1,
        }));

        return res.json(sets);
      } else {
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ error: `Method ${req.method} not allowed` });
      }
    }
    // Handle notes route: GET/POST /api/workouts/{id}/exercises/{exerciseId}/notes
    else if (isNotes && exerciseId) {
      if (req.method === 'POST') {
        // Save exercise notes
        const { athleteId, notes } = req.body;

        if (!athleteId) {
          return res.status(400).json({ error: 'athleteId is required' });
        }

        // Verify workout and exercise exist
        const { data: workout, error: workoutError } = await supabase
          .from('workouts')
          .select('id')
          .eq('id', workoutId)
          .single();

        if (workoutError || !workout) {
          return res.status(404).json({ error: 'Workout not found' });
        }

        const { data: exercise, error: exerciseError } = await supabase
          .from('block_exercises')
          .select('id')
          .eq('id', exerciseId)
          .single();

        if (exerciseError || !exercise) {
          return res.status(404).json({ error: 'Exercise not found' });
        }

        const noteId = `${exerciseId}_${workoutId}_${athleteId}`;

        // Upsert note
        const { error } = await supabase
          .from('exercise_notes')
          .upsert({
            id: noteId,
            block_exercise_id: exerciseId,
            workout_id: workoutId,
            athlete_id: athleteId,
            notes: notes || '',
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'id',
          });

        if (error) throw error;

        return res.json({ success: true, message: 'Notes saved successfully' });
      } else if (req.method === 'GET') {
        // Get exercise notes for an athlete
        const { athleteId } = req.query;

        if (!athleteId || typeof athleteId !== 'string') {
          return res.status(400).json({ error: 'athleteId query parameter is required' });
        }

        const { data: note, error } = await supabase
          .from('exercise_notes')
          .select('notes')
          .eq('block_exercise_id', exerciseId)
          .eq('workout_id', workoutId)
          .eq('athlete_id', athleteId)
          .single();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        return res.json({ notes: note?.notes || '' });
      } else {
        res.setHeader('Allow', ['GET', 'POST']);
        return res.status(405).json({ error: `Method ${req.method} not allowed` });
      }
    } else {
      return res.status(404).json({ error: 'Route not found' });
    }
  } catch (error: any) {
    console.error('Error in nested workout route:', error);
    return res.status(500).json({ error: error.message || 'Failed to process request' });
  }
}
