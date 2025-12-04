import { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseClient } from '../_helpers/supabase.js';
import { handleCors, setCorsHeaders } from '../_helpers/cors.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  setCorsHeaders(res);

  const supabase = getSupabaseClient();
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Athlete ID is required' });
  }

  try {
    if (req.method === 'GET') {
      // Get single athlete
      const { data, error } = await supabase
        .from('athletes')
        .select('id, name, email, created_at, login_token')
        .eq('id', id)
        .single();

      if (error || !data) {
        return res.status(404).json({ error: 'Athlete not found' });
      }

      res.json({
        id: data.id,
        name: data.name,
        email: data.email,
        createdAt: data.created_at,
        loginToken: data.login_token || null,
      });
    } else if (req.method === 'PUT') {
      // Update athlete
      const { name, email, password } = req.body;

      const updates: any = {};
      if (name !== undefined) updates.name = name;
      if (email !== undefined) updates.email = email;
      if (password !== undefined) updates.password_hash = password;

      const { data, error } = await supabase
        .from('athletes')
        .update(updates)
        .eq('id', id)
        .select('id, name, email, created_at, login_token')
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({ error: 'Athlete not found' });
        }
        if (error.code === '23505') {
          return res.status(409).json({ error: 'Email already exists' });
        }
        throw error;
      }

      res.json({
        id: data.id,
        name: data.name,
        email: data.email,
        createdAt: data.created_at,
        loginToken: data.login_token || null,
      });
    } else if (req.method === 'DELETE') {
      // Delete athlete
      const { error } = await supabase
        .from('athletes')
        .delete()
        .eq('id', id);

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({ error: 'Athlete not found' });
        }
        throw error;
      }

      res.status(204).end();
    } else {
      res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
      res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error: any) {
    console.error('Error in athlete API:', error);
    res.status(500).json({ error: error.message || 'Failed to process request' });
  }
}
