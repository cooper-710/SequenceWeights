import { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseClient } from '../_helpers/supabase';
import { handleCors, setCorsHeaders } from '../_helpers/cors';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  setCorsHeaders(res);

  const supabase = getSupabaseClient();

  try {
    if (req.method === 'POST') {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({ error: 'Token is required' });
      }

      // Find athlete by login token
      const { data: athlete, error } = await supabase
        .from('athletes')
        .select('id, name, email')
        .eq('login_token', token)
        .single();

      if (error || !athlete) {
        return res.status(401).json({ error: 'Invalid token' });
      }

      res.json({
        user: {
          id: athlete.id,
          name: athlete.name,
          email: athlete.email,
          role: 'user' as const,
        },
      });
    } else {
      res.setHeader('Allow', ['POST']);
      res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error: any) {
    console.error('Error during login:', error);
    res.status(500).json({ error: error.message || 'Failed to login' });
  }
}
