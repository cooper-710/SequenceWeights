import { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseClient } from '../../_helpers/supabase.js';
import { handleCors, setCorsHeaders } from '../../_helpers/cors.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  setCorsHeaders(res);

  const supabase = getSupabaseClient();
  const { id: teamId } = req.query;
  const urlParts = req.url?.split('/') || [];
  const athleteIdIndex = urlParts.indexOf('athletes');
  const athleteId = athleteIdIndex >= 0 && athleteIdIndex < urlParts.length - 1
    ? urlParts[athleteIdIndex + 1]
    : null;

  if (!teamId || typeof teamId !== 'string') {
    return res.status(400).json({ error: 'Team ID is required' });
  }

  try {
    if (req.method === 'POST') {
      // POST /api/teams/:id/athletes - Add athlete to team
      const { athleteId: bodyAthleteId } = req.body;
      const targetAthleteId = bodyAthleteId || athleteId;

      if (!targetAthleteId) {
        return res.status(400).json({ error: 'Athlete ID is required' });
      }

      // Check if team exists
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .select('id')
        .eq('id', teamId)
        .single();

      if (teamError || !team) {
        return res.status(404).json({ error: 'Team not found' });
      }

      // Check if athlete exists
      const { data: athlete, error: athleteError } = await supabase
        .from('athletes')
        .select('id')
        .eq('id', targetAthleteId)
        .single();

      if (athleteError || !athlete) {
        return res.status(404).json({ error: 'Athlete not found' });
      }

      // Check if already in team
      const { data: existing } = await supabase
        .from('team_athletes')
        .select('*')
        .eq('team_id', teamId)
        .eq('athlete_id', targetAthleteId)
        .single();

      if (existing) {
        return res.status(409).json({ error: 'Athlete is already in this team' });
      }

      // Add athlete to team
      const { error } = await supabase
        .from('team_athletes')
        .insert({
          team_id: teamId,
          athlete_id: targetAthleteId,
        });

      if (error) throw error;

      res.status(204).end();
    } else if (req.method === 'DELETE' && athleteId) {
      // DELETE /api/teams/:id/athletes/:athleteId - Remove athlete from team
      if (!athleteId || typeof athleteId !== 'string') {
        return res.status(400).json({ error: 'Athlete ID is required' });
      }

      const { error } = await supabase
        .from('team_athletes')
        .delete()
        .eq('team_id', teamId)
        .eq('athlete_id', athleteId);

      if (error) throw error;

      res.status(204).end();
    } else {
      res.setHeader('Allow', ['POST', 'DELETE']);
      res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error: any) {
    console.error('Error in team athletes API:', error);
    res.status(500).json({ error: error.message || 'Failed to process request' });
  }
}
