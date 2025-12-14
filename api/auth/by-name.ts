import { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseClient } from '../_helpers/supabase.js';
import { handleCors, setCorsHeaders } from '../_helpers/cors.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  setCorsHeaders(res);

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  const supabase = getSupabaseClient();
  const playerName = req.query.player as string;

  if (!playerName) {
    return res.status(400).json({ error: 'Player name is required' });
  }

  try {
    // Decode the player name (handle + as spaces)
    const decodedName = decodeURIComponent(playerName.replace(/\+/g, '%20'));

    // Get all athletes from Supabase
    const { data: athletes, error: fetchError } = await supabase
      .from('athletes')
      .select('id, name, email');

    if (fetchError) {
      console.error('Error fetching athletes:', fetchError);
      return res.status(500).json({ error: 'Failed to fetch athletes' });
    }

    if (!athletes || athletes.length === 0) {
      return res.status(401).json({ error: 'Athlete not found' });
    }

    // Find athlete by exact name match (case-insensitive)
    const athlete = athletes.find(a => 
      a.name.toLowerCase() === decodedName.toLowerCase()
    );

    if (!athlete) {
      return res.status(401).json({ error: 'Athlete not found' });
    }

    res.json({
      user: {
        id: athlete.id,
        name: athlete.name,
        email: athlete.email,
        role: 'user' as const,
      },
    });
  } catch (error: any) {
    console.error('Error in auth by-name API:', error);
    res.status(500).json({ error: error.message || 'Failed to process request' });
  }
}



