import { workoutsApi, Workout } from './api';

// Types for navigation state
export interface NavigationState {
  workout?: Workout;
  completionStatus?: Record<string, {
    status: 'completed' | 'in-progress' | 'not-started';
    completedSets: number;
    totalSets: number;
    repsVary?: boolean;
    commonReps?: string;
    minReps?: number;
    maxReps?: number;
  }>;
  workouts?: Workout[];
  workoutCompletionStatus?: Record<string, boolean>;
}

// Helper to navigate with workout data
// Accepts any function that matches the navigate signature
export const navigateWithWorkout = async (
  navigate: (to: string, options?: { state?: NavigationState }) => void,
  url: string,
  workoutId: string,
  userId: string,
  includeCompletionStatus = true
) => {
  try {
    const workout = await workoutsApi.getById(workoutId);
    const state: NavigationState = { workout };
    
    if (includeCompletionStatus) {
      const completionStatus = await workoutsApi.getCompletionStatus(workoutId, userId);
      state.completionStatus = completionStatus;
    }
    
    navigate(url, { state });
  } catch (err) {
    console.error('Error fetching workout data:', err);
    navigate(url, {}); // Navigate anyway without state
  }
};

// Helper to navigate with workouts list
export const navigateWithWorkouts = async (
  navigate: (to: string, options?: { state?: NavigationState }) => void,
  url: string,
  userId: string
) => {
  try {
    const workouts = await workoutsApi.getAll({ athleteId: userId });
    const completionStatus: Record<string, boolean> = {};
    
    // Load completion status for all workouts
    for (const workout of workouts) {
      try {
        const status = await workoutsApi.getCompletionStatus(workout.id, userId);
        const allExercises = workout.blocks.flatMap(block => block.exercises);
        const isCompleted = allExercises.length > 0 && allExercises.every(exercise => {
          const exerciseName = exercise.exerciseName || (exercise as any).name || '';
          const exerciseStatus = status[exerciseName];
          return exerciseStatus?.status === 'completed';
        });
        completionStatus[workout.id] = isCompleted;
      } catch (err) {
        completionStatus[workout.id] = false;
      }
    }
    
    navigate(url, { state: { workouts, workoutCompletionStatus: completionStatus } });
  } catch (err) {
    console.error('Error fetching workouts:', err);
    navigate(url, {});
  }
};

