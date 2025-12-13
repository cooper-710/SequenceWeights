import { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseClient } from '../_helpers/supabase.js';
import { handleCors, setCorsHeaders } from '../_helpers/cors.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  setCorsHeaders(res);

  const supabase = getSupabaseClient();

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  try {
    const { athleteId } = req.query;

    if (!athleteId || typeof athleteId !== 'string') {
      return res.status(400).json({ error: 'athleteId query parameter is required' });
    }

    // Get all completed workouts for this athlete
    const { data: completions, error } = await supabase
      .from('workout_completions')
      .select('workout_id')
      .eq('athlete_id', athleteId);

    if (error) throw error;

    // Convert to a simple object: { workoutId: true }
    const completionMap: Record<string, boolean> = {};
    (completions || []).forEach((completion: any) => {
      completionMap[completion.workout_id] = true;
    });

    res.json(completionMap);
  } catch (error: any) {
    console.error('Error fetching workout completions:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch workout completions' });
  }
}

