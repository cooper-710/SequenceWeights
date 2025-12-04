import { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseClient } from '../../../../_helpers/supabase';
import { handleCors, setCorsHeaders } from '../../../../_helpers/cors';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  setCorsHeaders(res);

  const supabase = getSupabaseClient();
  const { id: teamId, athleteId } = req.query;

  if (!teamId || typeof teamId !== 'string' || !athleteId || typeof athleteId !== 'string') {
    return res.status(400).json({ error: 'Team ID and Athlete ID are required' });
  }

  try {
    if (req.method === 'DELETE') {
      // Remove athlete from team
      const { error } = await supabase
        .from('team_athletes')
        .delete()
        .eq('team_id', teamId)
        .eq('athlete_id', athleteId);

      if (error) throw error;

      res.status(204).send();
    } else {
      res.setHeader('Allow', ['DELETE']);
      res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error: any) {
    console.error('Error removing athlete from team:', error);
    res.status(500).json({ error: error.message || 'Failed to remove athlete from team' });
  }
}
