// In production, use relative URLs (same origin as frontend)
// In development, use VITE_API_URL or default to localhost
const getApiBaseUrl = () => {
  if (import.meta.env.PROD) {
    // Production: use same origin (Vercel serves both frontend and API)
    return '/api';
  }
  // Development: use environment variable or default
  return import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
};

const API_BASE_URL = getApiBaseUrl();

export interface Exercise {
  id: string;
  name: string;
  videoUrl?: string;
  category?: string;
  instructions?: string;
}

export interface Athlete {
  id: string;
  name: string;
  email: string;
  createdAt?: string;
  loginToken?: string;
}

export interface WorkoutExercise {
  id: string;
  exerciseName: string;
  sets: number;
  reps: string;
  weight?: string;
  videoUrl?: string;
}

export interface Block {
  id: string;
  name: string;
  exercises: WorkoutExercise[];
}

export interface Workout {
  id: string;
  name: string;
  date: string;
  athleteId?: string;
  teamId?: string;
  blocks: Block[];
}

export interface Team {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  athletes: Athlete[];
  workouts: any[];
}

// Generic fetch wrapper
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP error! status: ${response.status}`);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

// Exercises API
export const exercisesApi = {
  getAll: () => apiRequest<Exercise[]>('/exercises'),
  getById: (id: string) => apiRequest<Exercise>(`/exercises/${id}`),
  create: (exercise: Omit<Exercise, 'id'>) => 
    apiRequest<Exercise>('/exercises', {
      method: 'POST',
      body: JSON.stringify(exercise),
    }),
  update: (id: string, exercise: Partial<Exercise>) =>
    apiRequest<Exercise>(`/exercises/${id}`, {
      method: 'PUT',
      body: JSON.stringify(exercise),
    }),
  delete: (id: string) =>
    apiRequest<void>(`/exercises/${id}`, {
      method: 'DELETE',
    }),
};

// Athletes API
export const athletesApi = {
  getAll: () => apiRequest<Athlete[]>('/athletes'),
  getById: (id: string) => apiRequest<Athlete>(`/athletes/${id}`),
  create: (athlete: Omit<Athlete, 'id' | 'createdAt'> & { password?: string }) =>
    apiRequest<Athlete>('/athletes', {
      method: 'POST',
      body: JSON.stringify(athlete),
    }),
  update: (id: string, athlete: Partial<Athlete & { password?: string }>) =>
    apiRequest<Athlete>(`/athletes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(athlete),
    }),
  delete: (id: string) =>
    apiRequest<void>(`/athletes/${id}`, {
      method: 'DELETE',
    }),
};

// Workouts API
export const workoutsApi = {
  getAll: (filters?: { athleteId?: string; teamId?: string; templatesOnly?: boolean }) => {
    const params = new URLSearchParams();
    if (filters?.athleteId) params.append('athleteId', filters.athleteId);
    if (filters?.teamId) params.append('teamId', filters.teamId);
    if (filters?.templatesOnly) params.append('templatesOnly', 'true');
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiRequest<Workout[]>(`/workouts${query}`);
  },
  getById: (id: string) => apiRequest<Workout>(`/workouts/${id}`),
  create: (workout: Omit<Workout, 'id'>) =>
    apiRequest<Workout>('/workouts', {
      method: 'POST',
      body: JSON.stringify(workout),
    }),
  update: (id: string, workout: Partial<Workout>) =>
    apiRequest<Workout>(`/workouts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(workout),
    }),
  delete: (id: string) =>
    apiRequest<void>(`/workouts/${id}`, {
      method: 'DELETE',
    }),
  saveExerciseSets: (
    workoutId: string,
    exerciseId: string,
    athleteId: string,
    sets: Array<{ set: number; weight: string; reps: string; completed: boolean }>
  ) =>
    apiRequest<{ success: boolean }>(`/workouts/${workoutId}/exercises/${exerciseId}/sets`, {
      method: 'POST',
      body: JSON.stringify({ athleteId, sets }),
    }),
  getExerciseSets: (workoutId: string, exerciseId: string, athleteId: string) =>
    apiRequest<Array<{ set: number; weight: string; reps: string; completed: boolean }>>(
      `/workouts/${workoutId}/exercises/${exerciseId}/sets?athleteId=${athleteId}`
    ),
  getCompletionStatus: (workoutId: string, athleteId: string) =>
    apiRequest<Record<string, { status: 'completed' | 'in-progress' | 'not-started'; completedSets: number; totalSets: number }>>(
      `/workouts/${workoutId}/completion?athleteId=${athleteId}`
    ),
  saveExerciseNotes: (
    workoutId: string,
    exerciseId: string,
    athleteId: string,
    notes: string
  ) =>
    apiRequest<{ success: boolean }>(`/workouts/${workoutId}/exercises/${exerciseId}/notes`, {
      method: 'POST',
      body: JSON.stringify({ athleteId, notes }),
    }),
  getExerciseNotes: (workoutId: string, exerciseId: string, athleteId: string) =>
    apiRequest<{ notes: string }>(
      `/workouts/${workoutId}/exercises/${exerciseId}/notes?athleteId=${athleteId}`
    ),
};

// Teams API
export const teamsApi = {
  getAll: () => apiRequest<Team[]>('/teams'),
  getById: (id: string) => apiRequest<Team>(`/teams/${id}`),
  create: (team: Omit<Team, 'id' | 'createdAt' | 'athletes' | 'workouts'>) =>
    apiRequest<Team>('/teams', {
      method: 'POST',
      body: JSON.stringify(team),
    }),
  update: (id: string, team: Partial<Omit<Team, 'id' | 'createdAt' | 'athletes' | 'workouts'>>) =>
    apiRequest<Team>(`/teams/${id}`, {
      method: 'PUT',
      body: JSON.stringify(team),
    }),
  delete: (id: string) =>
    apiRequest<void>(`/teams/${id}`, {
      method: 'DELETE',
    }),
  addAthlete: (teamId: string, athleteId: string) =>
    apiRequest<void>(`/teams/${teamId}/athletes`, {
      method: 'POST',
      body: JSON.stringify({ athleteId }),
    }),
  removeAthlete: (teamId: string, athleteId: string) =>
    apiRequest<void>(`/teams/${teamId}/athletes?athleteId=${athleteId}`, {
      method: 'DELETE',
    }),
};
