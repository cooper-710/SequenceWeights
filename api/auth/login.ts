import { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseClient } from '../_helpers/supabase.js';
import { handleCors, setCorsHeaders } from '../_helpers/cors.js';

async function validateTokenAndGetUser(token: string, supabase: any) {
  const { data: athlete, error } = await supabase
    .from('athletes')
    .select('id, name, email')
    .eq('login_token', token)
    .single();

  if (error || !athlete) {
    return null;
  }

  return {
    user: {
      id: athlete.id,
      name: athlete.name,
      email: athlete.email,
      role: 'user' as const,
    },
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  setCorsHeaders(res);

  const supabase = getSupabaseClient();

  try {
    let token: string | undefined;

    if (req.method === 'POST') {
      // POST /api/auth/login - token in request body
      token = req.body?.token;
    } else if (req.method === 'GET') {
      // GET /api/auth/login?token=xxx - token in query params (for validation)
      token = req.query.token as string;
    } else {
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }

    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }

    const result = await validateTokenAndGetUser(token, supabase);

    if (!result) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    res.json(result);
  } catch (error: any) {
    console.error('Error in auth login API:', error);
    res.status(500).json({ error: error.message || 'Failed to process request' });
  }
}
