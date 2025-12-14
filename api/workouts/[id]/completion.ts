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

    // OPTIMIZED: Fetch all blocks at once (only need IDs for next query)
    const { data: blocks, error: blocksError } = await supabase
      .from('blocks')
      .select('id')
      .eq('workout_id', workoutId)
      .order('order_index', { ascending: true });

    if (blocksError) throw blocksError;
    if (!blocks || blocks.length === 0) {
      return res.json({});
    }

    const blockIds = blocks.map(b => b.id);

    // OPTIMIZED: Fetch all exercises for all blocks in a single query
    const { data: exercises, error: exercisesError } = await supabase
      .from('block_exercises')
      .select('id, exercise_name, reps')
      .in('block_id', blockIds)
      .order('order_index', { ascending: true });

    if (exercisesError) throw exercisesError;
    if (!exercises || exercises.length === 0) {
      return res.json({});
    }

    const exerciseIds = exercises.map(e => e.id);

    // OPTIMIZED: Fetch ALL sets for all exercises in a single query
    const { data: allSets, error: setsError } = await supabase
      .from('exercise_sets')
      .select('block_exercise_id, set_number, reps, completed')
      .in('block_exercise_id', exerciseIds)
      .eq('workout_id', workoutId)
      .eq('athlete_id', athleteId);

    if (setsError) throw setsError;

    // OPTIMIZED: Group sets by exercise ID in memory for efficient lookup
    const setsByExercise = new Map<string, Array<{ set_number: number; reps: string | null; completed: boolean }>>();
    (allSets || []).forEach((set: any) => {
      const exerciseId = set.block_exercise_id;
      if (!setsByExercise.has(exerciseId)) {
        setsByExercise.set(exerciseId, []);
      }
      setsByExercise.get(exerciseId)!.push({
        set_number: set.set_number,
        reps: set.reps,
        completed: set.completed === 1 || set.completed === true
      });
    });

    // Process completion status for each exercise (same logic as before)
    const completionStatus: Record<string, any> = {};

    exercises.forEach((exercise: any) => {
      const exerciseSets = setsByExercise.get(exercise.id) || [];
      const totalSets = exerciseSets.length;
      const completedCount = exerciseSets.filter(s => s.completed).length;

      // Check if reps vary across sets
      const repsValues = exerciseSets
        .map((s: any) => s.reps?.trim())
        .filter((r: string) => r && r !== '' && r !== '--')
        .map((r: string) => {
          const parsed = parseInt(r);
          return isNaN(parsed) ? null : parsed;
        })
        .filter((r: number | null) => r !== null) as number[];
      
      const uniqueReps = [...new Set(repsValues)];
      const repsVary = uniqueReps.length > 1;
      const commonReps = repsVary ? null : (repsValues[0]?.toString() || exercise.reps);
      const minReps = repsValues.length > 0 ? Math.min(...repsValues) : null;
      const maxReps = repsValues.length > 0 ? Math.max(...repsValues) : null;

      let status: 'completed' | 'in-progress' | 'not-started' = 'not-started';
      if (completedCount === totalSets && totalSets > 0) {
        status = 'completed';
      } else if (completedCount > 0) {
        status = 'in-progress';
      }

      // Same key structure as before: exercise.exercise_name
      completionStatus[exercise.exercise_name] = {
        status,
        completedSets: completedCount,
        totalSets,
        repsVary,
        commonReps: commonReps || exercise.reps,
        minReps,
        maxReps,
      };
    });

    res.json(completionStatus);
  } catch (error: any) {
    console.error('Error in completion API:', error);
    res.status(500).json({ error: error.message || 'Failed to process request' });
  }
}

