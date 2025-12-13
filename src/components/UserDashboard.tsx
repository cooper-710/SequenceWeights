import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Dumbbell, ChevronRight, Bed, Check } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { workoutsApi, Workout } from '../utils/api';
import { createTokenPreservingNavigate } from '../utils/tokenNavigation';
import { NavigationState } from '../utils/navigation';
import { SequenceLogoText } from './SequenceLogoText';

interface UserDashboardProps {
  user: { id: string; name: string; role: 'admin' | 'user' };
  onLogout: () => void;
}

interface ScheduledWorkout {
  id: string;
  name: string;
  date: string;
  status: 'completed' | 'in-progress' | 'not-started';
  exerciseCount: number;
}

export function UserDashboard({ user, onLogout }: UserDashboardProps) {
  const navigateBase = useNavigate();
  const navigate = createTokenPreservingNavigate(navigateBase);
  const location = useLocation();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [workouts, setWorkouts] = useState<ScheduledWorkout[]>([]);
  const [fullWorkouts, setFullWorkouts] = useState<Workout[]>([]); // Store full workout data
  const [loading, setLoading] = useState(true);
  const [workoutCompletionStatus, setWorkoutCompletionStatus] = useState<Record<string, boolean>>({});
  const [completionStatusMap, setCompletionStatusMap] = useState<Record<string, Record<string, any>>>({});
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null); // Store full completion status

  // Helper function to format date as YYYY-MM-DD in local timezone
  const formatLocalDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Helper function to parse YYYY-MM-DD string as local date (not UTC)
  const parseLocalDate = (dateStr: string): Date => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  // Load workouts for this user
  useEffect(() => {
    loadWorkouts();
  }, [user.id]);

  // Refresh completion status whenever the calendar becomes visible
  useEffect(() => {
    // Function to refresh completion status
    const refreshCompletionStatus = async () => {
      if (fullWorkouts.length === 0) return;
      
      try {
        // Load completion status in parallel for all workouts
        const completionPromises = fullWorkouts.map(async (workout) => {
          try {
            const status = await workoutsApi.getCompletionStatus(workout.id, user.id);
            // Check if all exercises are completed
            const allExercises = workout.blocks.flatMap(block => block.exercises);
            const isCompleted = allExercises.length > 0 && allExercises.every(exercise => {
              const exerciseName = exercise.exerciseName || (exercise as any).name || '';
              const exerciseStatus = status[exerciseName];
              return exerciseStatus?.status === 'completed';
            });
            
            return { workoutId: workout.id, isCompleted, status };
          } catch (err) {
            console.error(`Failed to refresh completion status for workout ${workout.id}:`, err);
            return { workoutId: workout.id, isCompleted: false, status: {} };
          }
        });
        
        // Wait for all completion statuses in parallel
        const results = await Promise.all(completionPromises);
        
        // Update state once with all results
        const newCompletionStatus: Record<string, boolean> = {};
        const newCompletionStatusMap: Record<string, Record<string, any>> = {};
        results.forEach(({ workoutId, isCompleted, status }) => {
          newCompletionStatus[workoutId] = isCompleted;
          newCompletionStatusMap[workoutId] = status;
        });
        setWorkoutCompletionStatus(prev => ({
          ...prev,
          ...newCompletionStatus
        }));
        setCompletionStatusMap(prev => ({
          ...prev,
          ...newCompletionStatusMap
        }));
      } catch (err) {
        console.error('Failed to refresh completion status:', err);
      }
    };

    // Refresh when page becomes visible (user navigates back or switches tabs)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && fullWorkouts.length > 0) {
        refreshCompletionStatus();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Refresh when navigating back to this page (location pathname changes to /user)
    if (location.pathname === '/user' && fullWorkouts.length > 0) {
      // Clear any existing timeout to prevent multiple refreshes
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      // Refresh immediately when navigating back
      refreshCompletionStatus();
    }

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fullWorkouts.length, user.id, location.pathname]);

  // Check for workouts passed via navigation state (prevents flash of stale data)
  useEffect(() => {
    const locationState = location.state as NavigationState | null;
    
    // Handle completion status update from WorkoutViewer or ExerciseDetail
    if (locationState?.completionStatus && locationState?.workout) {
      const workout = locationState.workout;
      const completionStatus = locationState.completionStatus;
      
      // Calculate if workout is completed
      const allExercises = workout.blocks.flatMap(block => block.exercises);
      const isCompleted = allExercises.length > 0 && allExercises.every(exercise => {
        const exerciseName = exercise.exerciseName || (exercise as any).name || '';
        const exerciseStatus = completionStatus[exerciseName];
        return exerciseStatus?.status === 'completed';
      });
      
      // Immediately update the completion status (no delay!)
      setWorkoutCompletionStatus(prev => ({
        ...prev,
        [workout.id]: isCompleted
      }));
      
      setCompletionStatusMap(prev => ({
        ...prev,
        [workout.id]: completionStatus
      }));
      
      // Clear the state
      window.history.replaceState({ ...locationState, workout: undefined, completionStatus: undefined }, '');
      
      // Immediately refresh ALL workouts' completion status (not just this one)
      // This ensures all completed workouts show as complete immediately
      if (fullWorkouts.length > 0) {
        // Load completion status in parallel for all workouts
        const completionPromises = fullWorkouts.map(async (w) => {
          try {
            const status = await workoutsApi.getCompletionStatus(w.id, user.id);
            const allExercises = w.blocks.flatMap(block => block.exercises);
            const isCompleted = allExercises.length > 0 && allExercises.every(exercise => {
              const exerciseName = exercise.exerciseName || (exercise as any).name || '';
              const exerciseStatus = status[exerciseName];
              return exerciseStatus?.status === 'completed';
            });
            return { workoutId: w.id, isCompleted, status };
          } catch (err) {
            console.error(`Failed to refresh completion status for workout ${w.id}:`, err);
            return { workoutId: w.id, isCompleted: false, status: {} };
          }
        });
        
        // Update all workouts' completion status immediately
        Promise.all(completionPromises).then(results => {
          const newCompletionStatus: Record<string, boolean> = {};
          const newCompletionStatusMap: Record<string, Record<string, any>> = {};
          results.forEach(({ workoutId, isCompleted, status }) => {
            newCompletionStatus[workoutId] = isCompleted;
            newCompletionStatusMap[workoutId] = status;
          });
          setWorkoutCompletionStatus(prev => ({
            ...prev,
            ...newCompletionStatus
          }));
          setCompletionStatusMap(prev => ({
            ...prev,
            ...newCompletionStatusMap
          }));
        });
      }
      return;
    }
    
    if (locationState?.workouts && locationState?.workoutCompletionStatus) {
      // Use the passed data immediately (no flash!)
      const scheduledWorkouts: ScheduledWorkout[] = locationState.workouts.map(workout => ({
        id: workout.id,
        name: workout.name,
        date: workout.date,
        status: 'not-started' as const,
        exerciseCount: workout.blocks.reduce((total, block) => total + block.exercises.length, 0),
      }));
      setWorkouts(scheduledWorkouts);
      setWorkoutCompletionStatus(locationState.workoutCompletionStatus);
      setLoading(false);
      // Refresh in background to ensure it's up to date
      setTimeout(() => {
        loadWorkouts();
      }, 300);
      // Clear the state so it doesn't persist on next navigation
      window.history.replaceState({ ...locationState, workouts: undefined, workoutCompletionStatus: undefined }, '');
      return;
    }
  }, [location.state, fullWorkouts, user.id]);

  const loadWorkouts = async () => {
    try {
      setLoading(true);
      const data = await workoutsApi.getAll({ athleteId: user.id });
      setFullWorkouts(data); // Store full workout data
      
      const scheduledWorkouts: ScheduledWorkout[] = data.map(workout => ({
        id: workout.id,
        name: workout.name,
        date: workout.date,
        status: 'not-started' as const,
        exerciseCount: workout.blocks.reduce((total, block) => total + block.exercises.length, 0),
      }));
      setWorkouts(scheduledWorkouts);
      
      // Load completion status in parallel for all workouts BEFORE showing calendar
      const completionPromises = data.map(async (workout) => {
        try {
          const status = await workoutsApi.getCompletionStatus(workout.id, user.id);
          // Check if all exercises are completed
          const allExercises = workout.blocks.flatMap(block => block.exercises);
          const isCompleted = allExercises.length > 0 && allExercises.every(exercise => {
            const exerciseName = exercise.exerciseName || (exercise as any).name || '';
            const exerciseStatus = status[exerciseName];
            return exerciseStatus?.status === 'completed';
          });
          
          return { workoutId: workout.id, isCompleted, status };
        } catch (err) {
          console.error(`Failed to load completion status for workout ${workout.id}:`, err);
          return { workoutId: workout.id, isCompleted: false, status: {} };
        }
      });
      
      // Wait for all completion statuses in parallel BEFORE showing calendar
      const results = await Promise.all(completionPromises);
      
      // Update state once with all results
      const newCompletionStatus: Record<string, boolean> = {};
      const newCompletionStatusMap: Record<string, Record<string, any>> = {};
      results.forEach(({ workoutId, isCompleted, status }) => {
        newCompletionStatus[workoutId] = isCompleted;
        newCompletionStatusMap[workoutId] = status;
      });
      setWorkoutCompletionStatus(prev => ({
        ...prev,
        ...newCompletionStatus
      }));
      setCompletionStatusMap(prev => ({
        ...prev,
        ...newCompletionStatusMap
      }));
      
      // NOW show calendar with completion status already loaded
      setLoading(false);
    } catch (err) {
      console.error('Failed to load workouts:', err);
      setWorkouts([]);
      setLoading(false);
    }
  };

  const todaysWorkout = workouts.find((w) => w.date === formatLocalDate(new Date()));

  // Sort workouts by date (upcoming first) and filter to only future/current workouts
  const today = formatLocalDate(new Date());
  const sortedWorkouts = [...workouts]
    .filter(workout => workout.date >= today)
    .sort((a, b) => {
      return a.date.localeCompare(b.date);
    })
    .slice(0, 5); // Only show next 5 workouts

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }

    // Add all days in the month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const hasWorkout = (date: Date | null) => {
    if (!date) return false;
    const dateStr = formatLocalDate(date);
    return workouts.some((w) => w.date === dateStr);
  };

  const isWorkoutCompleted = (date: Date | null) => {
    if (!date) return false;
    const dateStr = formatLocalDate(date);
    const workout = workouts.find((w) => w.date === dateStr);
    if (!workout) return false;
    return workoutCompletionStatus[workout.id] === true;
  };

  const getWorkoutForDate = (date: Date | null) => {
    if (!date) return null;
    const dateStr = formatLocalDate(date);
    return workouts.find((w) => w.date === dateStr) || null;
  };

  const handleDateClick = (date: Date | null) => {
    if (!date) return;
    const workout = getWorkoutForDate(date);
    if (workout) {
      // Get full workout data and completion status from cache
      const fullWorkout = fullWorkouts.find(w => w.id === workout.id);
      const completionStatus = completionStatusMap[workout.id];
      
      navigate(`/workout/${workout.id}`, { 
        state: { 
          workout: fullWorkout || null,
          completionStatus: completionStatus || null
        } 
      });
    }
  };

  const isToday = (date: Date | null) => {
    if (!date) return false;
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const getWeekDays = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }

    // Add all days in the month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="min-h-screen bg-black"
    >
      <div className="max-w-3xl mx-auto px-4 pt-4 pb-4 overflow-visible">
        <div className="flex flex-col items-center mb-8 relative overflow-visible">
          <div className="w-full flex justify-center mb-6">
            <SequenceLogoText />
          </div>
        </div>

        <div className="mb-3">
          <h2 className="text-white text-4xl tracking-tight">{user.name}</h2>
        </div>

        {/* Today's Workout or Rest Day */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm text-gray-400">Today's Workout</h3>
            <span className="text-sm text-gray-400">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </span>
          </div>

          {todaysWorkout ? (
            <div
              onClick={() => {
                // Get full workout data and completion status from cache
                const fullWorkout = fullWorkouts.find(w => w.id === todaysWorkout.id);
                const completionStatus = completionStatusMap[todaysWorkout.id];
                
                navigate(`/workout/${todaysWorkout.id}`, { 
                  state: { 
                    workout: fullWorkout || null,
                    completionStatus: completionStatus || null
                  } 
                });
              }}
              className="bg-[#F56E0F]/30 border border-[#F56E0F] rounded-xl p-6 cursor-pointer hover:bg-[#F56E0F]/40 transition-all transform hover:scale-[1.02]"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h4 className="text-white text-2xl font-semibold mb-2">{todaysWorkout.name}</h4>
                  <div className="flex items-center gap-2">
                    <Dumbbell className="w-4 h-4 text-white" />
                    <p className="text-orange-100 text-sm font-medium">{todaysWorkout.exerciseCount} {todaysWorkout.exerciseCount === 1 ? 'exercise' : 'exercises'}</p>
                  </div>
                </div>
                <ChevronRight className="w-6 h-6 text-white flex-shrink-0 mt-1" />
              </div>
            </div>
          ) : (
            <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-white text-xl mb-1">Rest Day</h4>
                  <p className="text-gray-400">Enjoy your recovery</p>
                </div>
                <div className="w-12 h-12 bg-zinc-700/50 rounded-full flex items-center justify-center">
                  <Bed className="w-6 h-6 text-gray-400" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Calendar */}
        <div className="mb-8">
          <h3 className="text-white text-lg mb-4">Calendar</h3>

          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-white">
                {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h4>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1))}
                  className="text-gray-400 hover:text-white px-2"
                >
                  ‹
                </button>
                <button
                  onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1))}
                  className="text-gray-400 hover:text-white px-2"
                >
                  ›
                </button>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="text-center text-xs text-gray-400 py-2">
                  {day}
                </div>
              ))}

              {getDaysInMonth(selectedDate).map((date, index) => {
                const hasW = hasWorkout(date);
                const completed = isWorkoutCompleted(date);
                const today = isToday(date);

                let className = 'aspect-square flex items-center justify-center rounded-lg text-sm transition-colors';
                
                if (date) {
                  if (today) {
                    if (completed) {
                      className += ' bg-green-500/30 border-2 border-green-500 text-white font-medium';
                      if (hasW) className += ' cursor-pointer hover:bg-green-500/40';
                    } else if (hasW) {
                      className += ' bg-[#F56E0F]/30 border border-[#F56E0F] text-white font-medium cursor-pointer hover:bg-[#F56E0F]/40';
                    } else {
                      className += ' bg-[#F56E0F]/30 border border-[#F56E0F] text-white font-medium';
                    }
                  } else if (hasW) {
                    if (completed) {
                      className += ' bg-zinc-800 text-white hover:bg-zinc-700 cursor-pointer border-2 border-green-500';
                    } else {
                      className += ' bg-zinc-800 text-white hover:bg-zinc-700 cursor-pointer';
                    }
                  } else {
                    className += ' text-gray-400 hover:bg-zinc-800/50 cursor-pointer';
                  }
                }

                return (
                  <div
                    key={index}
                    onClick={() => hasW && handleDateClick(date)}
                    className={className}
                    style={
                      completed && hasW && date
                        ? { border: '2px solid rgb(34, 197, 94)' }
                        : undefined
                    }
                  >
                    {date && (
                      <div className="relative w-full h-full flex flex-col items-center justify-center p-1 pb-2">
                        <span className="flex items-center justify-center text-center leading-none">{date.getDate()}</span>
                        {hasW && (
                          completed ? (
                            <div className="w-4 h-4 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0" style={{ backgroundColor: '#22c55e', minWidth: '16px', minHeight: '16px' }}>
                              <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} style={{ color: 'white' }} />
                            </div>
                          ) : (
                            <div className="w-1.5 h-1.5 bg-[#F56E0F] rounded-full mt-0.5"></div>
                          )
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Scheduled Workouts List */}
        <div>
          <h3 className="text-white text-lg mb-4">Schedule</h3>
          <div className="space-y-3">
            {sortedWorkouts.map((workout) => (
              <div
                key={workout.id}
                onClick={() => {
                  // Get full workout data and completion status from cache
                  const fullWorkout = fullWorkouts.find(w => w.id === workout.id);
                  const completionStatus = completionStatusMap[workout.id];
                  
                  navigate(`/workout/${workout.id}`, { 
                    state: { 
                      workout: fullWorkout || null,
                      completionStatus: completionStatus || null
                    } 
                  });
                }}
                className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 hover:border-zinc-700 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-500/10 rounded-lg flex items-center justify-center">
                      <Dumbbell className="w-5 h-5 text-orange-500" />
                    </div>
                    <div>
                      <h4 className="text-white">{workout.name}</h4>
                      <p className="text-sm text-gray-400">
                        {parseLocalDate(workout.date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}