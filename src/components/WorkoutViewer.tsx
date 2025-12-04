import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, Heart, Activity, Dumbbell, ChevronRight, CheckCircle2, Circle, PlayCircle } from 'lucide-react';
import sequenceLogo from 'figma:asset/5c2d0c8af8dfc8338b2c35795df688d7811f7b51.png';
import { ImageWithFallback } from './figma/ImageWithFallback';
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
  const navigate = useNavigate();
  const location = useLocation();
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completionStatus, setCompletionStatus] = useState<Record<string, { status: 'completed' | 'in-progress' | 'not-started'; completedSets: number; totalSets: number }>>({});

  const loadCompletionStatus = useCallback(async () => {
    if (!workoutId || !userId) return;
    
    try {
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

  useEffect(() => {
    if (workoutId) {
      loadWorkout();
    }
  }, [workoutId, loadWorkout]);

  // Load completion status when workoutId or userId changes
  useEffect(() => {
    if (workoutId && userId) {
      loadCompletionStatus();
    }
  }, [workoutId, userId, loadCompletionStatus]);

  // Reload completion status when navigating back to workout (location change)
  useEffect(() => {
    if (workoutId && userId && location.pathname.startsWith('/workout/')) {
      loadCompletionStatus();
    }
  }, [location.pathname, workoutId, userId, loadCompletionStatus]);

  // Reload completion status when page becomes visible (user returns from exercise or refreshes)
  useEffect(() => {
    if (!workoutId || !userId) return;

    // Reload when page becomes visible (handles tab switching and navigation back)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadCompletionStatus();
      }
    };

    // Reload when window gains focus (handles navigation back)
    const handleFocus = () => {
      loadCompletionStatus();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [workoutId, userId, loadCompletionStatus]);


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

  const formatSetsReps = (exercise: Exercise) => {
    if (!exercise.sets && !exercise.reps) return '';
    if (!exercise.reps) return `${exercise.sets} set${exercise.sets !== 1 ? 's' : ''}`;
    return `${exercise.sets} x ${exercise.reps}`;
  };

  if (loading) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading workout...</div>
      </div>
    );
  }

  if (error || !workout) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error || 'Workout not found'}</p>
          <button
            onClick={onBack}
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
    <div className="h-screen bg-black flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-black border-b border-[#F56E0F]/20 shadow-lg shadow-black/20 flex-shrink-0 overflow-visible">
        <div className="max-w-3xl mx-auto px-4 pt-12 pb-4 overflow-visible">
          <div className="flex items-start mb-6 relative overflow-visible">
            <button 
              onClick={() => navigate('/user')} 
              className="mt-2 p-3 rounded-lg bg-zinc-900 border border-zinc-800 text-gray-400 hover:text-[#F56E0F] hover:border-[#F56E0F]/50 transition-all z-10"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 sm:gap-6 absolute left-1/2 -translate-x-1/2 w-auto max-w-[calc(100%-120px)] overflow-visible">
              <div className="flex-shrink-0">
                <ImageWithFallback
                  src={sequenceLogo}
                  alt="Sequence"
                  className="h-12 sm:h-16 w-auto object-contain mix-blend-screen"
                  fallback={<img src={sequenceLogo} alt="Sequence" className="h-12 sm:h-16 w-auto object-contain mix-blend-screen" />}
                />
              </div>
              <div className="border-l border-[#F56E0F]/30 pl-6 sm:pl-10 flex-shrink-0">
                <h1 className="text-white text-lg sm:text-2xl tracking-[0.2em] mb-1 whitespace-nowrap">SEQUENCE</h1>
                <p className="text-xs text-[#F56E0F] uppercase tracking-[0.15em] whitespace-nowrap">Performance Training</p>
              </div>
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

      {/* Scrollable Exercise List */}
      <div className="flex-1 overflow-y-auto">
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
                      onClick={() => navigate(`/exercise/${workout.id}/${encodeURIComponent(exercise.exerciseName)}`)}
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
                            {formatSetsReps(exercise)}
                            {exercise.weight && ` @ ${exercise.weight}`}
                          </p>
                        </div>

                        {/* Chevron */}
                        <div className="flex-shrink-0">
                          <ChevronRight className="w-5 h-5 text-gray-600" />
                        </div>
                      </div>

                      {/* Set Progress Indicators */}
                      {exercise.sets > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-800">
                          <div className="flex items-center gap-2">
                            {Array.from({ length: exercise.sets }, (_, index) => {
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
    </div>
  );
}