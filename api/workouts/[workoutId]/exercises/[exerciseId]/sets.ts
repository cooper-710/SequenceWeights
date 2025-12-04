import { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseClient } from '../../../../_helpers/supabase';
import { handleCors, setCorsHeaders } from '../../../../_helpers/cors';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  setCorsHeaders(res);

  const supabase = getSupabaseClient();
  const { workoutId, exerciseId } = req.query;

  if (!workoutId || typeof workoutId !== 'string' || !exerciseId || typeof exerciseId !== 'string') {
    return res.status(400).json({ error: 'Workout ID and Exercise ID are required' });
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
  } catch (error: any) {
    console.error('Error in exercise sets API:', error);
    res.status(500).json({ error: error.message || 'Failed to process request' });
  }
}
