import { VercelRequest, VercelResponse } from '@vercel/node';
import { randomUUID } from 'crypto';
import { getSupabaseClient } from '../_helpers/supabase.js';
import { handleCors, setCorsHeaders } from '../_helpers/cors.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  setCorsHeaders(res);

  const supabase = getSupabaseClient();

  try {
    if (req.method === 'GET') {
      // Get all athletes
      const { data, error } = await supabase
        .from('athletes')
        .select('id, name, email, created_at, login_token')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const athletes = (data || []).map((athlete: any) => ({
        id: athlete.id,
        name: athlete.name,
        email: athlete.email,
        createdAt: athlete.created_at,
        loginToken: athlete.login_token || null,
      }));

      res.json(athletes);
    } else if (req.method === 'POST') {
      // Create new athlete
      const { name, email, password } = req.body;

      if (!name || !email) {
        return res.status(400).json({ error: 'Name and email are required' });
      }

      const id = randomUUID();
      const password_hash = password || null;
      const loginToken = randomUUID();

      const { data, error } = await supabase
        .from('athletes')
        .insert({
          id,
          name,
          email,
          password_hash,
          login_token: loginToken,
        })
        .select('id, name, email, created_at, login_token')
        .single();

      if (error) {
        if (error.code === '23505') {
          // Unique constraint violation (email)
          return res.status(409).json({ error: 'Email already exists' });
        }
        throw error;
      }

      res.status(201).json({
        id: data.id,
        name: data.name,
        email: data.email,
        createdAt: data.created_at,
        loginToken: data.login_token || null,
      });
    } else {
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error: any) {
    console.error('Error in athletes API:', error);
    res.status(500).json({ error: error.message || 'Failed to process request' });
  }
}
