import { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseClient } from '../../../_helpers/supabase';
import { handleCors, setCorsHeaders } from '../../../_helpers/cors';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  setCorsHeaders(res);

  const supabase = getSupabaseClient();
  const { id: workoutId } = req.query;
  const { athleteId } = req.query;

  if (!workoutId || typeof workoutId !== 'string') {
    return res.status(400).json({ error: 'Workout ID is required' });
  }

  if (!athleteId || typeof athleteId !== 'string') {
    return res.status(400).json({ error: 'athleteId query parameter is required' });
  }

  try {
    if (req.method === 'GET') {
      // Get all exercises in the workout
      const { data: blocks, error: blocksError } = await supabase
        .from('blocks')
        .select('*')
        .eq('workout_id', workoutId)
        .order('order_index', { ascending: true });

      if (blocksError) throw blocksError;

      const completionStatus: Record<string, any> = {};

      for (const block of blocks || []) {
        const { data: exercises, error: exercisesError } = await supabase
          .from('block_exercises')
          .select('*')
          .eq('block_id', block.id)
          .order('order_index', { ascending: true });

        if (exercisesError) throw exercisesError;

        for (const exercise of exercises || []) {
          // Get completion data for this exercise
          const { data: completedSetsData, error: countError } = await supabase
            .from('exercise_sets')
            .select('*', { count: 'exact', head: false })
            .eq('block_exercise_id', exercise.id)
            .eq('workout_id', workoutId)
            .eq('athlete_id', athleteId)
            .eq('completed', 1);

          if (countError) throw countError;

          const totalSets = exercise.sets;
          const completedCount = completedSetsData?.length || 0;

          let status: 'completed' | 'in-progress' | 'not-started' = 'not-started';
          if (completedCount === totalSets && totalSets > 0) {
            status = 'completed';
          } else if (completedCount > 0) {
            status = 'in-progress';
          }

          completionStatus[exercise.exercise_name] = {
            status,
            completedSets: completedCount,
            totalSets,
          };
        }
      }

      res.json(completionStatus);
    } else {
      res.setHeader('Allow', ['GET']);
      res.status(405).json({ error: `Method ${req.method} not allowed` });
    }
  } catch (error: any) {
    console.error('Error fetching completion status:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch completion status' });
  }
}
