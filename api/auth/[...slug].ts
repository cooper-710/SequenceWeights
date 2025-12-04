import { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseClient } from '../_helpers/supabase.js';
import { handleCors, setCorsHeaders } from '../_helpers/cors.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  setCorsHeaders(res);

  const supabase = getSupabaseClient();
  const { slug } = req.query;
  
  // slug is an array: ['login'] or ['validate', 'token-value']
  const slugArray = Array.isArray(slug) ? slug : slug ? [slug] : [];
  const route = slugArray[0] || '';

  try {
    if (route === 'login' && req.method === 'POST') {
      // POST /api/auth/login
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({ error: 'Token is required' });
      }

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
    } else if (route === 'validate' && req.method === 'GET') {
      // GET /api/auth/validate/:token
      const token = slugArray[1];

      if (!token || typeof token !== 'string') {
        return res.status(400).json({ error: 'Token is required' });
      }

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
      res.status(404).json({ error: 'Route not found' });
    }
  } catch (error: any) {
    console.error('Error in auth API:', error);
    res.status(500).json({ error: error.message || 'Failed to process request' });
  }
}
