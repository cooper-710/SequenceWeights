import { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseClient } from '../../../../_helpers/supabase';
import { handleCors, setCorsHeaders } from '../../../../_helpers/cors';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  setCorsHeaders(res);

  const supabase = getSupabaseClient();
  const { id: workoutId, exerciseId } = req.query;

  if (!workoutId || typeof workoutId !== 'string' || !exerciseId || typeof exerciseId !== 'string') {
    return res.status(400).json({ error: 'Workout ID and Exercise ID are required' });
  }

  try {
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
  } catch (error: any) {
    console.error('Error in exercise notes API:', error);
    res.status(500).json({ error: error.message || 'Failed to process request' });
  }
}
