// Helper function to get workout with blocks and exercises
export async function getWorkoutWithBlocks(supabase: any, workoutId: string) {
  const { data: workout, error: workoutError } = await supabase
    .from('workouts')
    .select('*')
    .eq('id', workoutId)
    .single();

  if (workoutError || !workout) return null;

  const { data: blocks, error: blocksError } = await supabase
    .from('blocks')
    .select('*')
    .eq('workout_id', workoutId)
    .order('order_index', { ascending: true });

  if (blocksError) throw blocksError;

  const blocksWithExercises = await Promise.all(
    (blocks || []).map(async (block: any) => {
      const { data: exercises, error: exercisesError } = await supabase
        .from('block_exercises')
        .select('*')
        .eq('block_id', block.id)
        .order('order_index', { ascending: true });

      if (exercisesError) throw exercisesError;

      return {
        id: block.id,
        name: block.name,
        exercises: (exercises || []).map((ex: any) => ({
          id: ex.id,
          exerciseName: ex.exercise_name,
          sets: ex.sets,
          reps: ex.reps,
          weight: ex.weight || undefined,
        })),
      };
    })
  );

  return {
    id: workout.id,
    name: workout.name,
    date: workout.date,
    athleteId: workout.athlete_id || undefined,
    teamId: workout.team_id || undefined,
    blocks: blocksWithExercises,
  };
}
