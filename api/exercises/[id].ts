import { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseClient } from '../_helpers/supabase';
import { handleCors, setCorsHeaders } from '../_helpers/cors';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  setCorsHeaders(res);

  const supabase = getSupabaseClient();
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Exercise ID is required' });
  }

  try {
    if (req.method === 'GET') {
      // Get single exercise
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) {
        return res.status(404).json({ error: 'Exercise not found' });
      }

      res.json({
        id: data.id,
        name: data.name,
        videoUrl: data.video_url || undefined,
        category: data.category || undefined,
        instructions: data.instructions || undefined,
      });
    } else if (req.method === 'PUT') {
      // Update exercise
      const { name, videoUrl, category, instructions } = req.body;

      const updates: any = {
        updated_at: new Date().toISOString(),
      };

      if (name !== undefined) updates.name = name;
      if (videoUrl !== undefined) updates.video_url = videoUrl || null;
      if (category !== undefined) updates.category = category || null;
      if (instructions !== undefined) updates.instructions = instructions || null;

      const { data, error } = await supabase
        .from('exercises')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error || !data) {
        if (error?.code === 'PGRST116') {
          return res.status(404).json({ error: 'Exercise not found' });
        }
        throw error;
      }

      res.json({
        id: data.id,
        name: data.name,
        videoUrl: data.video_url || undefined,
        category: data.category || undefined,
        instructions: data.instructions || undefined,
      });
    } else if (req.method === 'DELETE') {
      // Delete exercise
      const { error } = await supabase
        .from('exercises')
        .delete()
        .eq('id', id);

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({ error: 'Exercise not found' });
        }
        throw error;
      }

      // Re-index remaining exercises to be sequential
      const { data: allExercises } = await supabase
        .from('exercises')
        .select('*')
        .order('id', { ascending: true });

      if (allExercises && allExercises.length > 0) {
        const updates = allExercises.map((ex, index) => ({
          id: ex.id,
          newId: (index + 1).toString(),
        }));

        // Update IDs sequentially
        for (const update of updates) {
          if (update.id !== update.newId) {
            await supabase
              .from('exercises')
              .update({ id: update.newId })
              .eq('id', update.id);
          }
        }
      }

      res.status(204).send();
    } else {
      res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
      res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error: any) {
    console.error('Error in exercise API:', error);
    res.status(500).json({ error: error.message || 'Failed to process request' });
  }
}
