import { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseClient } from '../_helpers/supabase.js';
import { handleCors, setCorsHeaders } from '../_helpers/cors.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  setCorsHeaders(res);

  const supabase = getSupabaseClient();

  try {
    if (req.method === 'GET') {
      // Get all exercises
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;

      // Transform to match existing API format
      const exercises = (data || []).map(ex => ({
        id: ex.id,
        name: ex.name,
        videoUrl: ex.video_url || undefined,
        category: ex.category || undefined,
        instructions: ex.instructions || undefined,
      }));

      res.json(exercises);
    } else if (req.method === 'POST') {
      // Create new exercise
      const { name, videoUrl, category, instructions } = req.body;

      if (!name) {
        return res.status(400).json({ error: 'Exercise name is required' });
      }

      // Get max ID to generate new sequential ID
      const { data: maxData } = await supabase
        .from('exercises')
        .select('id')
        .order('id', { ascending: false })
        .limit(1);

      let newId = '1';
      if (maxData && maxData.length > 0) {
        const maxIdNum = parseInt(maxData[0].id, 10) || 0;
        newId = (maxIdNum + 1).toString();
      }

      const { data, error } = await supabase
        .from('exercises')
        .insert({
          id: newId,
          name,
          video_url: videoUrl || null,
          category: category || null,
          instructions: instructions || null,
        })
        .select()
        .single();

      if (error) throw error;

      res.status(201).json({
        id: data.id,
        name: data.name,
        videoUrl: data.video_url || undefined,
        category: data.category || undefined,
        instructions: data.instructions || undefined,
      });
    } else {
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error: any) {
    console.error('Error in exercises API:', error);
    res.status(500).json({ error: error.message || 'Failed to process request' });
  }
}
