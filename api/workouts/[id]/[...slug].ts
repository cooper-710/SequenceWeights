import { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseClient } from '../../_helpers/supabase.js';
import { handleCors, setCorsHeaders } from '../../_helpers/cors.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  setCorsHeaders(res);

  const supabase = getSupabaseClient();
  const { id: workoutId } = req.query;
  
  // Parse URL to get path segments
  const urlPath = req.url || '';
  const pathParts = urlPath.split('/').filter(Boolean);
  
  // Find workout ID index and get segments after it
  const workoutIndex = pathParts.indexOf(workoutId as string);
  const routeSegments = workoutIndex >= 0 ? pathParts.slice(workoutIndex + 1) : [];
  
  // Determine which route we're handling based on path segments
  const isCompletion = routeSegments[0] === 'completion';
  const isSets = routeSegments.includes('sets');
  const isNotes = routeSegments.includes('notes');
  const exerciseIdIndex = routeSegments.indexOf('exercises');
  const exerciseId = exerciseIdIndex >= 0 && exerciseIdIndex < routeSegments.length - 1
    ? routeSegments[exerciseIdIndex + 1]
    : null;

  if (!workoutId || typeof workoutId !== 'string') {
    return res.status(400).json({ error: 'Workout ID is required' });
  }

  try {
    // Handle completion route
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

      res.json(completionStatus);
    }
    // Handle sets route
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
    }
    // Handle notes route
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

        res.json({ success: true, message: 'Notes saved successfully' });
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

        res.json({ notes: note?.notes || '' });
      } else {
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).json({ error: `Method ${req.method} not allowed` });
      }
    } else {
      res.status(404).json({ error: 'Route not found' });
    }
  } catch (error: any) {
    console.error('Error in workout nested API:', error);
    res.status(500).json({ error: error.message || 'Failed to process request' });
  }
}
