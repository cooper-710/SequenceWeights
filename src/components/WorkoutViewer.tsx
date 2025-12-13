import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { createTokenPreservingNavigate, getPlayerFromUrl, addPlayerToUrl } from '../utils/tokenNavigation';
import { NavigationState } from '../utils/navigation';
import { ChevronLeft, Heart, Activity, Dumbbell, ChevronRight, CheckCircle2, Circle, PlayCircle } from 'lucide-react';
import { SequenceLogoText } from './SequenceLogoText';
import { LoadingScreen } from './LoadingScreen';
import { workoutsApi, Workout } from '../utils/api';

interface Exercise {
  id: string;
  exerciseName: string;
  sets: number;
  reps: string;
  weight?: string;
  status?: 'completed' | 'in-progress' | 'not-started';
}

interface Block {
  id: string;
  name: string;
  exercises: Exercise[];
}

interface Workout {
  id: string;
  name: string;
  date: string;
  blocks: Block[];
}

interface WorkoutViewerProps {
  userId: string;
  onBack: () => void;
}

export function WorkoutViewer({ userId, onBack }: WorkoutViewerProps) {
  const { workoutId } = useParams();
  const navigateBase = useNavigate();
  const navigate = createTokenPreservingNavigate(navigateBase);
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completionStatus, setCompletionStatus] = useState<Record<string, { 
    status: 'completed' | 'in-progress' | 'not-started'; 
    completedSets: number; 
    totalSets: number;
    repsVary?: boolean;
    commonReps?: string;
    minReps?: number;
    maxReps?: number;
  }>>({});
  
  // Track if we have initial data from navigation state
  const [hasInitialData, setHasInitialData] = useState(false);

  const loadCompletionStatus = useCallback(async () => {
    if (!workoutId || !userId) return;
    
    try {
      // Load immediately - no artificial delay
      const status = await workoutsApi.getCompletionStatus(workoutId, userId);
      setCompletionStatus(status);
    } catch (err) {
      console.error('Failed to load completion status:', err);
    }
  }, [workoutId, userId]);

  const loadWorkout = useCallback(async () => {
    if (!workoutId) return;
    
    try {
      setLoading(true);
      setError(null);
      const data = await workoutsApi.getById(workoutId);
      setWorkout(data);
    } catch (err) {
      console.error('Failed to load workout:', err);
      setError('Failed to load workout. Make sure the backend server is running.');
    } finally {
      setLoading(false);
    }
  }, [workoutId]);

  // Check for workout and completion status passed via navigation state (prevents flash of stale data)
  useEffect(() => {
    const locationState = location.state as NavigationState | null;
    if (locationState?.workout) {
      // Use the passed workout immediately (no flash!)
      setWorkout(locationState.workout);
      setHasInitialData(true);
      setLoading(false);
      
      // Also set completion status if provided
      if (locationState.completionStatus) {
        setCompletionStatus(locationState.completionStatus);
      }
      
      // Refresh in background to ensure it's up to date (only if we don't have completion status)
      if (!locationState.completionStatus) {
        setTimeout(() => {
          loadCompletionStatus();
        }, 100);
      } else {
        // Still refresh completion status in background but less urgently
        setTimeout(() => {
          loadCompletionStatus();
        }, 500);
      }
      
      // Refresh workout in background
      setTimeout(() => {
        loadWorkout();
      }, 100);
      
      // Clear the state so it doesn't persist on next navigation
      window.history.replaceState({ ...locationState, workout: undefined, completionStatus: undefined }, '');
      return;
    }
    
    if (workoutId) {
      loadWorkout();
    }
  }, [workoutId, loadWorkout, location.state, loadCompletionStatus]);

  // Load completion status when workoutId or userId changes (only if we don't have it from state)
  useEffect(() => {
    if (workoutId && userId && !hasInitialData) {
      loadCompletionStatus();
    }
  }, [workoutId, userId, loadCompletionStatus, hasInitialData]);

  // Reload completion status when navigating back to workout (location change)
  // Removed visibility change and focus listeners - they cause unnecessary re-fetches
  // The completion status will be refreshed when navigating back naturally


  const getBlockColor = (index: number) => {
    const colors = [
      'bg-gray-500', // Warm up
      'bg-emerald-400', // First block
      'bg-cyan-400', // Second block
      'bg-pink-400', // Third block
      'bg-purple-400', // Fourth block
      'bg-yellow-400', // Fifth block
    ];
    return colors[index % colors.length];
  };

  const getBlockBorderColor = (index: number) => {
    const colors = [
      'border-gray-500/30',
      'border-emerald-400/30',
      'border-cyan-400/30',
      'border-pink-400/30',
      'border-purple-400/30',
      'border-yellow-400/30',
    ];
    return colors[index % colors.length];
  };

  const getStatusIcon = (exercise: Exercise) => {
    if (exercise.exerciseName === 'Body Weight') {
      return <Heart className="w-5 h-5" />;
    }
    if (exercise.exerciseName === 'CMJ') {
      return <Activity className="w-5 h-5" />;
    }
    return <Dumbbell className="w-5 h-5" />;
  };

  const getStatusIndicator = (status: string) => {
    if (status === 'completed') {
      return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
    }
    if (status === 'in-progress') {
      return <PlayCircle className="w-5 h-5 text-[#F56E0F]" />;
    }
    return <Circle className="w-5 h-5 text-gray-600" />;
  };

  const formatSetsReps = (exercise: Exercise, statusData?: { 
    totalSets?: number; 
    repsVary?: boolean; 
    commonReps?: string; 
    minReps?: number; 
    maxReps?: number;
  }) => {
    const setsToShow = statusData?.totalSets || exercise.sets;
    const repsToShow = statusData?.repsVary 
      ? (statusData.minReps && statusData.maxReps && statusData.minReps !== statusData.maxReps
          ? `${statusData.minReps}-${statusData.maxReps}`
          : 'varies')
      : (statusData?.commonReps || exercise.reps);
    
    if (!setsToShow && !repsToShow) return '';
    if (!repsToShow) return `${setsToShow} set${setsToShow !== 1 ? 's' : ''}`;
    return `${setsToShow} x ${repsToShow}`;
  };

  // Only show loading screen if we don't have workout data AND we're actually loading
  if (loading && !workout) {
    return <LoadingScreen />;
  }

  if (error || !workout) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error || 'Workout not found'}</p>
          <button
            onClick={() => {
              // Pass workout and completion status immediately for instant calendar update
              if (workout) {
                navigate('/user', {
                  state: {
                    workout: workout,
                    completionStatus: completionStatus
                  }
                });
              } else {
                navigate('/user');
              }
            }}
            className="text-orange-500 hover:text-orange-600"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Calculate total exercises across all blocks
  const totalExercises = workout.blocks.reduce((total, block) => total + block.exercises.length, 0);
  const completedExercises = Object.values(completionStatus).filter(
    (status) => status.status === 'completed'
  ).length;
  const isWorkoutComplete = totalExercises > 0 && completedExercises === totalExercises;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="min-h-screen bg-black"
    >
      {/* Header */}
      <div className="bg-black border-b border-[#F56E0F]/20 shadow-lg shadow-black/20 overflow-visible pt-[env(safe-area-inset-top,0px)]">
        <div className="max-w-3xl mx-auto px-4 pt-4 pb-4 overflow-visible">
          <div className="flex items-center justify-center mb-6 relative overflow-visible">
            <button 
              onClick={() => {
                // Pass workout and completion status immediately for instant calendar update
                if (workout) {
                  navigate('/user', {
                    state: {
                      workout: workout,
                      completionStatus: completionStatus
                    }
                  });
                } else {
                  navigate('/user');
                }
              }} 
              className="absolute left-0 p-3 rounded-lg bg-zinc-900 border border-zinc-800 text-gray-400 hover:text-[#F56E0F] hover:border-[#F56E0F]/50 transition-all z-10"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="w-full flex justify-center overflow-visible">
              <SequenceLogoText />
            </div>
          </div>

          <div className={`${isWorkoutComplete 
            ? 'bg-emerald-500/30 border-2 border-emerald-500' 
            : 'bg-[#F56E0F]/30 border border-[#F56E0F]'
          } rounded-lg p-4 transition-all duration-300`}>
            <div className="flex items-center gap-3 mb-2">
              {isWorkoutComplete && (
                <CheckCircle2 className="w-8 h-8 text-emerald-400 flex-shrink-0" />
              )}
              <h2 className={`text-2xl font-semibold tracking-tight leading-tight ${
                isWorkoutComplete ? 'text-emerald-400' : 'text-white'
              }`}>
                {isWorkoutComplete ? 'Workout Complete' : workout.name}
              </h2>
            </div>
            
            {/* Date Display */}
            {workout.date && !isWorkoutComplete && (
              <p className="text-white text-sm font-medium uppercase tracking-[0.1em]">
                {(() => {
                  const [year, month, day] = workout.date.split('-').map(Number);
                  const date = new Date(year, month - 1, day);
                  return date.toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  });
                })()}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Exercise List */}
      <div>
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-8">
          {workout.blocks.map((block, blockIndex) => (
            <div key={block.id} className="space-y-3">
              {/* Block Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className={`px-4 py-1.5 ${getBlockColor(blockIndex)} rounded-full`}>
                  <span className="text-black uppercase tracking-wider text-sm">
                    {block.name}
                  </span>
                </div>
                <div className="flex-1 h-px bg-gradient-to-r from-gray-700 to-transparent"></div>
              </div>

              {/* Exercise Cards */}
              <div className="space-y-3">
                {block.exercises.map((exercise) => {
                  const exerciseStatus = completionStatus[exercise.exerciseName]?.status || exercise.status || 'not-started';
                  const statusData = completionStatus[exercise.exerciseName];
                  
                  return (
                    <div
                      key={exercise.id}
                      onClick={() => {
                        const token = searchParams.get('token');
                        const playerName = getPlayerFromUrl();
                        const url = playerName
                          ? addPlayerToUrl(`/exercise/${workout.id}/${encodeURIComponent(exercise.exerciseName)}`, playerName)
                          : token 
                            ? `/exercise/${workout.id}/${encodeURIComponent(exercise.exerciseName)}?token=${token}`
                            : `/exercise/${workout.id}/${encodeURIComponent(exercise.exerciseName)}`;
                        // Pass workout data via state to prevent flash
                        navigate(url, { state: { workout } });
                      }}
                      className={`
                        bg-[#1B1B1E] border ${getBlockBorderColor(blockIndex)}
                        rounded-xl p-4 cursor-pointer
                        transition-all duration-200
                        hover:border-[#F56E0F]/50 hover:shadow-lg hover:shadow-[#F56E0F]/10
                        hover:translate-y-[-2px]
                        ${exerciseStatus === 'in-progress' ? 'ring-2 ring-[#F56E0F]/30 border-[#F56E0F]/50' : ''}
                      `}
                    >
                      <div className="flex items-center gap-4">
                        {/* Status Indicator */}
                        <div className="flex-shrink-0">
                          {getStatusIndicator(exerciseStatus)}
                        </div>

                        {/* Exercise Icon */}
                        <div className={`
                          flex-shrink-0 w-12 h-12 rounded-lg 
                          ${exerciseStatus === 'in-progress' ? 'bg-[#F56E0F]/10 text-[#F56E0F]' : 'bg-black text-gray-500'}
                          flex items-center justify-center
                          border border-gray-800
                        `}>
                          {getStatusIcon(exercise)}
                        </div>

                        {/* Exercise Info */}
                        <div className="flex-1 min-w-0">
                          <h3 className={`
                            mb-1 truncate
                            ${exerciseStatus === 'in-progress' ? 'text-white' : 'text-gray-300'}
                          `}>
                            {exercise.exerciseName}
                          </h3>
                          <p className="text-gray-500 text-sm">
                            {formatSetsReps(exercise, statusData)}
                            {exercise.weight && ` @ ${exercise.weight}`}
                          </p>
                        </div>

                        {/* Chevron */}
                        <div className="flex-shrink-0">
                          <ChevronRight className="w-5 h-5 text-gray-600" />
                        </div>
                      </div>

                      {/* Set Progress Indicators */}
                      {(statusData?.totalSets || exercise.sets) > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-800">
                          <div className="flex items-center gap-2">
                            {Array.from({ length: statusData?.totalSets || exercise.sets }, (_, index) => {
                              const setNumber = index + 1;
                              const completedSets = statusData?.completedSets || 0;
                              const isCompleted = setNumber <= completedSets;
                              
                              return (
                                <div
                                  key={setNumber}
                                  className={`h-2 rounded-full transition-all ${
                                    isCompleted
                                      ? 'bg-gradient-to-r from-[#F56E0F] to-orange-500'
                                      : 'bg-gray-700'
                                  }`}
                                  style={{
                                    width: '100%',
                                    flex: '1 1 0%',
                                  }}
                                />
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}