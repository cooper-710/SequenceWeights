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

// Helper to navigate with workout data (passes existing data if provided, navigates immediately)
export const navigateWithWorkout = (
  navigate: (to: string, options?: { state?: NavigationState }) => void,
  url: string,
  existingData?: { workout?: Workout; completionStatus?: NavigationState['completionStatus'] }
) => {
  // Navigate immediately with existing data if available
  const state: NavigationState = {};
  if (existingData?.workout) {
    state.workout = existingData.workout;
  }
  if (existingData?.completionStatus) {
    state.completionStatus = existingData.completionStatus;
  }
  
  navigate(url, Object.keys(state).length > 0 ? { state } : {});
  
  // Components will fetch their own data if not provided via state
};

// Helper to navigate with workouts list (navigates immediately - too slow to fetch all completion statuses)
export const navigateWithWorkouts = (
  navigate: (to: string, options?: { state?: NavigationState }) => void,
  url: string,
  existingData?: { workouts?: Workout[]; workoutCompletionStatus?: Record<string, boolean> }
) => {
  // Navigate immediately with existing data if available
  const state: NavigationState = {};
  if (existingData?.workouts) {
    state.workouts = existingData.workouts;
  }
  if (existingData?.workoutCompletionStatus) {
    state.workoutCompletionStatus = existingData.workoutCompletionStatus;
  }
  
  navigate(url, Object.keys(state).length > 0 ? { state } : {});
  
  // UserDashboard will fetch its own data if not provided via state
};

