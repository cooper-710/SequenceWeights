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

      // Get all IDs and find the numeric maximum with error handling
      const { data: allExercises, error: fetchError } = await supabase
        .from('exercises')
        .select('id');

      if (fetchError) {
        console.error('Error fetching exercises for ID generation:', fetchError);
        throw fetchError;
      }

      let newId = '1';
      if (allExercises && allExercises.length > 0) {
        // Parse all IDs as numbers and find the actual max
        const maxIdNum = allExercises.reduce((max, ex) => {
          const idNum = parseInt(ex.id, 10) || 0;
          return idNum > max ? idNum : max;
        }, 0);
        newId = (maxIdNum + 1).toString();
      }

      console.log(`Attempting to create exercise with ID: ${newId}, Total exercises: ${allExercises?.length || 0}`);

      // Try to insert, with retry logic for duplicate key errors
      let attempts = 0;
      const maxAttempts = 5;
      let inserted = false;
      let finalData = null;

      while (attempts < maxAttempts && !inserted) {
        try {
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

          if (error) {
            // Check if it's a duplicate key error
            if (error.code === '23505' || error.message?.includes('duplicate key') || error.message?.includes('exercises_pkey')) {
              console.warn(`Duplicate key error for ID ${newId}, incrementing and retrying...`);
              // Increment ID and retry
              const currentIdNum = parseInt(newId, 10) || 0;
              newId = (currentIdNum + 1).toString();
              attempts++;
              continue;
            }
            throw error;
          }

          finalData = data;
          inserted = true;
        } catch (err: any) {
          if (err.code === '23505' || err.message?.includes('duplicate key') || err.message?.includes('exercises_pkey')) {
            console.warn(`Duplicate key error for ID ${newId}, incrementing and retrying...`);
            const currentIdNum = parseInt(newId, 10) || 0;
            newId = (currentIdNum + 1).toString();
            attempts++;
            continue;
          }
          throw err;
        }
      }

      if (!inserted) {
        throw new Error(`Failed to insert exercise after ${maxAttempts} attempts due to duplicate key conflicts`);
      }

      res.status(201).json({
        id: finalData.id,
        name: finalData.name,
        videoUrl: finalData.video_url || undefined,
        category: finalData.category || undefined,
        instructions: finalData.instructions || undefined,
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
