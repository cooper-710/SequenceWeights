import { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseClient } from '../../../../_helpers/supabase.js';
import { handleCors, setCorsHeaders } from '../../../../_helpers/cors.js';

// Helper function to check and mark workout as complete
async function checkAndMarkWorkoutComplete(supabase: any, workoutId: string, athleteId: string) {
  try {
    // Get all exercises in the workout
    const { data: blocks, error: blocksError } = await supabase
      .from('blocks')
      .select('*')
      .eq('workout_id', workoutId)
      .order('order_index', { ascending: true });

    if (blocksError) throw blocksError;

    let totalExercises = 0;
    let completedExercises = 0;

    for (const block of blocks || []) {
      const { data: exercises, error: exercisesError } = await supabase
        .from('block_exercises')
        .select('*')
        .eq('block_id', block.id)
        .order('order_index', { ascending: true });

      if (exercisesError) throw exercisesError;

      for (const exercise of exercises || []) {
        totalExercises++;
        
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

        if (completedCount === totalSets && totalSets > 0) {
          completedExercises++;
        }
      }
    }

    // If all exercises are completed, mark workout as complete
    if (totalExercises > 0 && completedExercises === totalExercises) {
      // Use upsert to handle both new and existing completions
      const { error: upsertError } = await supabase
        .from('workout_completions')
        .upsert({
          workout_id: workoutId,
          athlete_id: athleteId,
          completed_at: new Date().toISOString(),
        }, {
          onConflict: 'workout_id,athlete_id'
        });

      if (upsertError) throw upsertError;
    } else {
      // If not complete, remove from completions table (in case it was previously complete)
      await supabase
        .from('workout_completions')
        .delete()
        .eq('workout_id', workoutId)
        .eq('athlete_id', athleteId);
    }
  } catch (error) {
    console.error('Error checking workout completion:', error);
    // Don't throw - we don't want to fail the sets save if completion check fails
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  setCorsHeaders(res);

  const supabase = getSupabaseClient();
  const { id: workoutId, exerciseId } = req.query;

  if (!workoutId || typeof workoutId !== 'string') {
    return res.status(400).json({ error: 'Workout ID is required' });
  }

  if (!exerciseId || typeof exerciseId !== 'string') {
    return res.status(400).json({ error: 'Exercise ID is required' });
  }

  try {
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

      // Use upsert instead of delete + insert to avoid race conditions and duplicate key errors
      const setsToUpsert = sets.map((set: any) => ({
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

      // Upsert all sets at once (handles both new and existing sets)
      const { error: upsertError } = await supabase
        .from('exercise_sets')
        .upsert(setsToUpsert, {
          onConflict: 'id'
        });

      if (upsertError) throw upsertError;

      // Check and mark workout as complete after saving sets (non-blocking)
      // Don't await - let it run in background to avoid slowing down the response
      checkAndMarkWorkoutComplete(supabase, workoutId, athleteId).catch(err => {
        console.error('Background completion check failed:', err);
      });

      res.json({ success: true, message: 'Sets saved successfully' });
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

      res.json(sets);
    } else {
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error: any) {
    console.error('Error in sets API:', error);
    res.status(500).json({ error: error.message || 'Failed to process request' });
  }
}

