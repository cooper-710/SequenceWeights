import { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseClient } from '../../_helpers/supabase.js';
import { handleCors, setCorsHeaders } from '../../_helpers/cors.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCors(req, res)) return;
  setCorsHeaders(res);

  const supabase = getSupabaseClient();
  const { id: workoutId } = req.query;

  if (!workoutId || typeof workoutId !== 'string') {
    return res.status(400).json({ error: 'Workout ID is required' });
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  try {
    const { athleteId } = req.query;

    if (!athleteId || typeof athleteId !== 'string') {
      return res.status(400).json({ error: 'athleteId query parameter is required' });
    }

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
  } catch (error: any) {
    console.error('Error in completion API:', error);
    res.status(500).json({ error: error.message || 'Failed to process request' });
  }
}

