import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { createTokenPreservingNavigate, addTokenToUrl, addPlayerToUrl, getPlayerFromUrl } from '../utils/tokenNavigation';
import { NavigationState } from '../utils/navigation';
import { ChevronLeft, Check, PlayCircle, XCircle, Plus, X } from 'lucide-react';
import { SequenceLogoText } from './SequenceLogoText';
import { LoadingScreen } from './LoadingScreen';
import { workoutsApi, exercisesApi, Workout, Exercise as ExerciseLib } from '../utils/api';

interface ExerciseDetailProps {
  userId: string;
  onBack: () => void;
}

interface SetData {
  set: number;
  weight: string;
  reps: string;
  completed: boolean;
}

interface WorkoutExercise {
  id: string;
  exerciseName: string;
  sets: number;
  reps: string;
  weight?: string;
  videoUrl?: string;
}

export function ExerciseDetail({ userId, onBack }: ExerciseDetailProps) {
  const { workoutId, exerciseName } = useParams<{ workoutId: string; exerciseName: string }>();
  const navigateBase = useNavigate();
  const navigate = createTokenPreservingNavigate(navigateBase);
  const location = useLocation();
  const decodedExerciseName = exerciseName ? decodeURIComponent(exerciseName) : '';
  
  // Get token or player name for manual URL construction if needed
  const token = new URLSearchParams(window.location.search).get('token');
  const playerName = getPlayerFromUrl();

  const [workout, setWorkout] = useState<Workout | null>(null);
  const [exercise, setExercise] = useState<WorkoutExercise | null>(null);
  const [exerciseLib, setExerciseLib] = useState<ExerciseLib | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'workout' | 'media'>('workout');
  const [sets, setSets] = useState<SetData[]>([]);
  const [notes, setNotes] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [allExercisesCompleted, setAllExercisesCompleted] = useState(false);
  const manualSaveInProgress = useRef(false);
  const celebrationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check for workout passed via navigation state (prevents flash of stale data)
  useEffect(() => {
    const locationState = location.state as NavigationState | null;
    if (locationState?.workout) {
      // Use the passed workout immediately (no flash!)
      setWorkout(locationState.workout);
      // Still need to load exercise-specific data, but workout is already there
    }
  }, [location.state]);

  // Fetch workout and exercise data
  useEffect(() => {
    if (!workoutId || !decodedExerciseName) return;

    const loadData = async () => {
      try {
        setLoading(true);
        
        // Check if we already have workout from location state
        const locationState = location.state as NavigationState | null;
        let workoutData = locationState?.workout;
        
        // Fetch workout if we don't have it from state
        if (!workoutData) {
          workoutData = await workoutsApi.getById(workoutId);
        }
        setWorkout(workoutData);

        // Find exercise in workout
        let foundExercise: WorkoutExercise | null = null;
        let blockIndex = 0;
        for (let i = 0; i < workoutData.blocks.length; i++) {
          const block = workoutData.blocks[i];
          foundExercise = block.exercises.find(
            ex => ex.exerciseName === decodedExerciseName
          ) || null;
          if (foundExercise) {
            blockIndex = i;
            break;
          }
        }

        if (!foundExercise) {
          setError('Exercise not found in workout');
          return;
        }

        setExercise(foundExercise);

        // Load saved sets or initialize default sets
        const loadSets = async () => {
          try {
            if (userId && foundExercise) {
              const savedSets = await workoutsApi.getExerciseSets(
                workoutId,
                foundExercise.id,
                userId
              );
              
              if (savedSets && savedSets.length > 0) {
                // Calculate total sets: use max of template sets and highest saved set number
                // This preserves sets that were added beyond the template count
                const maxSavedSetNumber = Math.max(...savedSets.map((s: any) => s.set));
                const totalSets = Math.max(foundExercise.sets, maxSavedSetNumber);
                
                const setsToShow = Array.from({ length: totalSets }, (_, i) => {
                  const saved = savedSets.find((s: any) => s.set === i + 1);
                  return saved || {
                    set: i + 1,
                    weight: foundExercise.weight || '',
                    reps: foundExercise.reps || '',
                    completed: false,
                  };
                });
                setSets(setsToShow);
                return;
              }
            }
          } catch (err) {
            console.error('Error loading saved sets:', err);
          }
          
          // Fallback to default sets if no saved sets found
          if (foundExercise) {
            setSets(
              Array.from({ length: foundExercise.sets }, (_, i) => ({
                set: i + 1,
                weight: foundExercise.weight || '',
                reps: foundExercise.reps || '',
                completed: false,
              }))
            );
          }
        };

        await loadSets();

        // Notes functionality disabled (removed to reduce serverless function count)
        // const loadNotes = async () => {
        //   try {
        //     if (userId && foundExercise) {
        //       const savedNotes = await workoutsApi.getExerciseNotes(
        //         workoutId,
        //         foundExercise.id,
        //         userId
        //       );
        //       if (savedNotes) {
        //         setNotes(savedNotes.notes || '');
        //       }
        //     }
        //   } catch (err) {
        //     console.error('Error loading saved notes:', err);
        //     setNotes('');
        //   }
        // };

        // await loadNotes();

        // Fetch exercise library to get video URL
        const allExercises = await exercisesApi.getAll();
        const libExercise = allExercises.find(
          ex => ex.name === decodedExerciseName
        );
        if (libExercise) {
          setExerciseLib(libExercise);
        }
      } catch (err: any) {
        console.error('Error loading exercise:', err);
        setError(err.message || 'Failed to load exercise');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [workoutId, decodedExerciseName, userId]);

  // Get all exercises for navigation
  const allExercises: Array<{ name: string; blockIndex: number; exerciseIndex: number }> = [];
  if (workout) {
    workout.blocks.forEach((block, blockIdx) => {
      block.exercises.forEach((ex, exIdx) => {
        allExercises.push({ name: ex.exerciseName, blockIndex: blockIdx, exerciseIndex: exIdx });
      });
    });
  }

  const currentIndex = allExercises.findIndex(
    ex => ex.name === decodedExerciseName
  );
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < allExercises.length - 1;

  // Save sets function
  const saveSets = useCallback(async () => {
    if (!userId || !exercise || !workoutId || sets.length === 0) return;
    
    try {
      setIsSaving(true);
      await workoutsApi.saveExerciseSets(workoutId, exercise.id, userId, sets);
    } catch (err: any) {
      console.error('Error saving sets:', err);
      // Optionally show error toast here
    } finally {
      setIsSaving(false);
    }
  }, [userId, exercise, workoutId, sets]);

  // Notes functionality disabled (removed to reduce serverless function count)
  // const saveNotes = useCallback(async () => {
  //   if (!userId || !exercise || !workoutId) return;
  //   
  //   try {
  //     await workoutsApi.saveExerciseNotes(workoutId, exercise.id, userId, notes);
  //   } catch (err: any) {
  //     console.error('Error saving notes:', err);
  //   }
  // }, [userId, exercise, workoutId, notes]);

  // Auto-save notes immediately when they change (no debounce for critical data)
  // useEffect(() => {
  //   if (!userId || !exercise || !workoutId || !notes) return;
  //   
  //   // Save notes immediately when changed
  //   const timer = setTimeout(() => {
  //     saveNotes();
  //   }, 500); // Small delay to avoid too many saves while typing
  //   
  //   return () => clearTimeout(timer);
  // }, [notes, saveNotes, userId, exercise, workoutId]);

  // Auto-save sets when they change (debounced to avoid too many API calls)
  useEffect(() => {
    if (!userId || !exercise || !workoutId || sets.length === 0) return;
    
    // Skip auto-save if a manual save just happened (prevents race condition)
    if (manualSaveInProgress.current) {
      manualSaveInProgress.current = false;
      return;
    }
    
    // Debounce saves to avoid too many API calls while user is making changes
    const timer = setTimeout(() => {
      saveSets().catch(err => {
        console.error('Auto-save sets failed:', err);
      });
    }, 1000); // 1 second delay for sets (longer than notes since sets change less frequently)
    
    return () => clearTimeout(timer);
  }, [sets, userId, exercise, workoutId]); // Note: saveSets intentionally excluded to avoid dependency loop

  // Ensure saves complete before component unmounts (when navigating away)
  useEffect(() => {
    return () => {
      // Save on unmount if there are unsaved changes
      if (userId && exercise && workoutId && sets.length > 0) {
        // Save without await since we're unmounting
        workoutsApi.saveExerciseSets(workoutId, exercise.id, userId, sets).catch(err => {
          console.error('Error saving sets on unmount:', err);
        });
      }
      // Notes functionality disabled
      // if (userId && exercise && workoutId && notes) {
      //   workoutsApi.saveExerciseNotes(workoutId, exercise.id, userId, notes).catch(err => {
      //     console.error('Error saving notes on unmount:', err);
      //   });
      // }
    };
  }, [userId, exercise, workoutId, sets, notes]);

  // Check if current exercise sets are all completed (immediate, no delay)
  const currentExerciseAllSetsCompleted = sets.length > 0 && sets.every(set => set.completed);

  // Check if all exercises are completed (for API check)
  useEffect(() => {
    if (!workout || !userId) return;
    
    const checkAllCompleted = async () => {
      try {
        const status = await workoutsApi.getCompletionStatus(workout.id, userId);
        const totalExercises = workout.blocks.reduce((total, block) => total + block.exercises.length, 0);
        const allCompleted = Object.values(status).every(
          (exerciseStatus) => exerciseStatus.status === 'completed'
        ) && Object.keys(status).length === totalExercises;
        setAllExercisesCompleted(allCompleted);
      } catch (err) {
        console.error('Error checking completion status:', err);
        setAllExercisesCompleted(false);
      }
    };
    
    checkAllCompleted();
  }, [workout, userId, sets]); // Re-check when sets change


  const handleCompleteWorkout = async () => {
    if (!workout || !exercise || !userId) return;
    
    // Show celebration immediately - optimistic UI
    setShowCelebration(true);
    
    // Save and verify in background
    try {
      // Save current exercise sets (don't wait for it to block the UI)
      const savePromise = saveSets();
      
      // Verify completion status in parallel
      const verifyCompletion = async () => {
        // Wait a small bit for save to complete
        await savePromise;
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Check completion status (single check, no retries)
        const status = await workoutsApi.getCompletionStatus(workout.id, userId);
        const totalExercises = workout.blocks.reduce((total, block) => total + block.exercises.length, 0);
        const allCompleted = Object.values(status).every(
          (exerciseStatus) => exerciseStatus.status === 'completed'
        ) && Object.keys(status).length === totalExercises;
        
        return { status, allCompleted };
      };
      
      const workoutUrl = playerName 
        ? addPlayerToUrl(`/workout/${workout.id}`, playerName)
        : addTokenToUrl(`/workout/${workout.id}`, token);
      
      const navigateAway = (status?: any) => {
        setShowCelebration(false);
        navigate(workoutUrl, { 
          state: { 
            workout,
            completionStatus: status
          } 
        });
      };
      
      // Verify in background, but navigate after animation regardless
      verifyCompletion().then(({ status, allCompleted }) => {
        // Navigate after 3 seconds
        celebrationTimeoutRef.current = setTimeout(() => {
          navigateAway(status);
        }, 3000);
      }).catch((err) => {
        console.error('Error verifying completion:', err);
        // Still navigate even if verification fails
        celebrationTimeoutRef.current = setTimeout(() => {
          navigateAway();
        }, 3000);
      });
    } catch (err) {
      console.error('Error completing workout:', err);
      // Still navigate even if there's an error
      const workoutUrl = playerName 
        ? addPlayerToUrl(`/workout/${workout.id}`, playerName)
        : addTokenToUrl(`/workout/${workout.id}`, token);
      celebrationTimeoutRef.current = setTimeout(() => {
        setShowCelebration(false);
        navigate(workoutUrl, { state: { workout } });
      }, 3000);
    }
  };

  const handleDismissCelebration = () => {
    if (!workout || !userId) return;
    
    // Clear any pending timeout
    if (celebrationTimeoutRef.current) {
      clearTimeout(celebrationTimeoutRef.current);
      celebrationTimeoutRef.current = null;
    }
    
    // Save and verify in background, then navigate
    const savePromise = saveSets();
    
    const verifyCompletion = async () => {
      await savePromise;
      await new Promise(resolve => setTimeout(resolve, 100));
      
      try {
        const status = await workoutsApi.getCompletionStatus(workout.id, userId);
        return status;
      } catch (err) {
        console.error('Error verifying completion:', err);
        return null;
      }
    };
    
    const workoutUrl = playerName 
      ? addPlayerToUrl(`/workout/${workout.id}`, playerName)
      : addTokenToUrl(`/workout/${workout.id}`, token);
    
    setShowCelebration(false);
    
    verifyCompletion().then((status) => {
      navigate(workoutUrl, { 
        state: { 
          workout,
          completionStatus: status
        } 
      });
    }).catch(() => {
      navigate(workoutUrl, { state: { workout } });
    });
  };

  const goToPrevious = async () => {
    if (hasPrevious && workout && exercise && userId) {
      await saveSets(); // Save before navigating
      // await saveNotes(); // Notes functionality disabled
      const prev = allExercises[currentIndex - 1];
      const url = playerName 
        ? addPlayerToUrl(`/exercise/${workout.id}/${encodeURIComponent(prev.name)}`, playerName)
        : addTokenToUrl(`/exercise/${workout.id}/${encodeURIComponent(prev.name)}`, token);
      // Pass workout data via state to prevent flash
      navigate(url, { state: { workout } });
    }
  };

  const goToNext = async () => {
    if (hasNext && workout && exercise && userId) {
      await saveSets(); // Save before navigating
      // await saveNotes(); // Notes functionality disabled
      const next = allExercises[currentIndex + 1];
      const url = playerName 
        ? addPlayerToUrl(`/exercise/${workout.id}/${encodeURIComponent(next.name)}`, playerName)
        : addTokenToUrl(`/exercise/${workout.id}/${encodeURIComponent(next.name)}`, token);
      // Pass workout data via state to prevent flash
      navigate(url, { state: { workout } });
    } else if (!hasNext && currentExerciseAllSetsCompleted) {
      // On last exercise and all sets completed
      await handleCompleteWorkout();
    }
  };

  // Get block info for current exercise
  let currentBlockIndex = 0;
  if (workout && exercise) {
    for (let i = 0; i < workout.blocks.length; i++) {
      if (workout.blocks[i].exercises.some(ex => ex.exerciseName === decodedExerciseName)) {
        currentBlockIndex = i;
        break;
      }
    }
  }

  const getBlockColor = (index: number) => {
    const colors = [
      'bg-gray-500',
      'bg-emerald-400',
      'bg-cyan-400',
      'bg-pink-400',
      'bg-purple-400',
      'bg-yellow-400',
    ];
    return colors[index % colors.length];
  };

  const blockColor = getBlockColor(currentBlockIndex);
  const blockName = workout?.blocks[currentBlockIndex]?.name || '';

  const updateSet = async (setIndex: number, field: 'weight' | 'reps', value: string) => {
    const newSets = sets.map((s, i) => (i === setIndex ? { ...s, [field]: value } : s));
    setSets(newSets);
    
    // Mark that we're doing a manual save to prevent auto-save from interfering
    manualSaveInProgress.current = true;
    
    // Save immediately for weight/reps changes
    if (userId && exercise && workoutId) {
      try {
        await workoutsApi.saveExerciseSets(workoutId, exercise.id, userId, newSets);
      } catch (err) {
        console.error('Error saving sets:', err);
      }
    }
  };

  const toggleSetComplete = async (setIndex: number) => {
    const newSets = sets.map((s, i) => (i === setIndex ? { ...s, completed: !s.completed } : s));
    setSets(newSets);
    
    // Mark that we're doing a manual save to prevent auto-save from interfering
    manualSaveInProgress.current = true;
    
    // Save immediately when a set is toggled
    if (userId && exercise && workoutId) {
      try {
        await workoutsApi.saveExerciseSets(workoutId, exercise.id, userId, newSets);
      } catch (err) {
        console.error('Error saving sets immediately:', err);
      }
    }
  };

  const addSet = async () => {
    const newSetNumber = sets.length + 1;
    const newSets = [...sets, {
      set: newSetNumber,
      weight: exercise?.weight || '',
      reps: exercise?.reps || '',
      completed: false,
    }];
    setSets(newSets);
    
    // Mark that we're doing a manual save to prevent auto-save from interfering
    manualSaveInProgress.current = true;
    
    // Save immediately after adding set
    if (userId && exercise && workoutId) {
      try {
        await workoutsApi.saveExerciseSets(workoutId, exercise.id, userId, newSets);
      } catch (err) {
        console.error('Error saving sets after adding:', err);
      }
    }
  };

  const deleteSet = async (setIndex: number) => {
    if (sets.length <= 1) return;
    const newSets = sets.filter((_, i) => i !== setIndex).map((s, i) => ({ ...s, set: i + 1 }));
    setSets(newSets);
    
    // Mark that we're doing a manual save to prevent auto-save from interfering
    manualSaveInProgress.current = true;
    
    // Save immediately after deleting set
    if (userId && exercise && workoutId) {
      try {
        await workoutsApi.saveExerciseSets(workoutId, exercise.id, userId, newSets);
      } catch (err) {
        console.error('Error saving sets after deleting:', err);
      }
    }
  };

  const completedCount = sets.filter(s => s.completed).length;
  const progressPercentage = sets.length > 0 ? (completedCount / sets.length) * 100 : 0;

  // Helper function to convert YouTube URLs to embed format
  const getVideoEmbedUrl = (url: string | undefined): string | null => {
    if (!url) return null;
    
    // If it's already an embed URL, return as is
    if (url.includes('embed') || url.includes('youtube.com/embed')) {
      return url;
    }
    
    // Convert YouTube watch URLs to embed format
    const youtubeWatchRegex = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/;
    const match = url.match(youtubeWatchRegex);
    if (match) {
      return `https://www.youtube.com/embed/${match[1]}`;
    }
    
    // If it's a direct video URL (mp4, webm, etc.), return as is
    if (url.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/i)) {
      return url;
    }
    
    // Return the URL as is if we can't determine the format
    return url;
  };

  // Get video URL from either the exercise or the exercise library
  const videoUrl = exercise?.videoUrl || exerciseLib?.videoUrl;
  const embedUrl = getVideoEmbedUrl(videoUrl);

  if (loading) {
    return <LoadingScreen />;
  }

  if (error || !exercise) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error || 'Exercise not found'}</p>
          <button
            onClick={() => {
              if (workoutId && workout) {
                const url = playerName 
                  ? addPlayerToUrl(`/workout/${workoutId}`, playerName)
                  : addTokenToUrl(`/workout/${workoutId}`, token);
                // Navigate with existing workout data
                navigate(url, { state: { workout } });
              } else {
                onBack();
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

  return (
    <div className="min-h-screen bg-black pb-24">
      {/* Header */}
      <div className="bg-black border-b border-[#F56E0F]/20 shadow-lg shadow-black/20 overflow-visible pt-[env(safe-area-inset-top,0px)]">
        <div className="max-w-3xl mx-auto px-4 pt-4 pb-4 overflow-visible">
          <div className="flex items-center justify-center mb-6 relative overflow-visible">
            <button 
              onClick={() => {
                // Navigate immediately - don't wait for saves
                if (workoutId && workout) {
                  const url = playerName 
                    ? addPlayerToUrl(`/workout/${workoutId}`, playerName)
                    : addTokenToUrl(`/workout/${workoutId}`, token);
                  
                  // Save in background without blocking navigation
                  if (userId && exercise && workoutId && sets.length > 0) {
                    saveSets().catch(err => {
                      console.error('Error saving sets on navigation:', err);
                    });
                  }
                  
                  // Navigate immediately with cached workout data
                  navigate(url, { state: { workout } });
                } else {
                  onBack();
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

          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className={`px-4 py-1.5 ${blockColor} rounded-full`}>
                <span className="text-black uppercase tracking-wider text-sm">
                  {blockName}
                </span>
              </div>
            </div>
            <div className="bg-[#1B1B1E] border border-zinc-800 rounded-xl px-6 py-4">
              <h2 className="text-white text-3xl tracking-tight">{decodedExerciseName}</h2>
            </div>
          </div>
        </div>
      </div>

      {/* Action Tabs */}
      <div className="bg-black border-b border-zinc-800/50">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setActiveTab('workout')}
              className={`flex items-center justify-center gap-2 py-3 rounded-lg transition-all ${
                activeTab === 'workout'
                  ? 'bg-[#F56E0F] text-white shadow-lg shadow-[#F56E0F]/20'
                  : 'bg-[#1B1B1E] text-gray-400 hover:text-white hover:border-[#F56E0F]/30 border border-zinc-800'
              }`}
            >
              <span className="uppercase tracking-wider text-sm">Workout</span>
            </button>
            <button
              onClick={() => setActiveTab('media')}
              className={`flex items-center justify-center gap-2 py-3 rounded-lg transition-all ${
                activeTab === 'media'
                  ? 'bg-[#F56E0F] text-white shadow-lg shadow-[#F56E0F]/20'
                  : 'bg-[#1B1B1E] text-gray-400 hover:text-white hover:border-[#F56E0F]/30 border border-zinc-800'
              }`}
            >
              <PlayCircle className="w-5 h-5" />
              <span className="uppercase tracking-wider text-sm">Video</span>
            </button>
          </div>
        </div>
      </div>

      {/* Media Section */}
      {activeTab === 'media' && (
        <div className="max-w-3xl mx-auto px-4 py-6">
          <div className="bg-[#1B1B1E] border border-zinc-800 rounded-2xl overflow-hidden aspect-video flex items-center justify-center">
            {embedUrl ? (
              embedUrl.match(/\.(mp4|webm|ogg|mov)(\?.*)?$/i) ? (
                // Direct video file
                <video
                  src={embedUrl}
                  controls
                  className="w-full h-full object-contain"
                  title={decodedExerciseName}
                >
                  Your browser does not support the video tag.
                </video>
              ) : (
                // Embed URL (YouTube, Vimeo, etc.)
                <iframe
                  src={embedUrl}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title={decodedExerciseName}
                />
              )
            ) : (
              <div className="text-center">
                <PlayCircle className="w-20 h-20 text-[#F56E0F] mx-auto mb-3" />
                <p className="text-gray-300">No video available</p>
                <p className="text-sm text-gray-500 mt-2">Video not found for this exercise</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sets Table */}
      {activeTab === 'workout' && (
        <div className="max-w-3xl mx-auto px-4 py-6">
          <div className="space-y-6">
            {/* Table Header */}
            <div className="grid grid-cols-[50px_120px_100px_50px] gap-3 px-4 text-xs text-gray-500 uppercase tracking-wider">
              <div>Set</div>
              <div>Weight (lbs)</div>
              <div>Reps</div>
              <div className="text-right">Done</div>
            </div>

            {/* Sets */}
            <div className="space-y-3">
              {sets.map((set, index) => (
                <div 
                  key={set.set} 
                  className={`
                    group bg-[#1B1B1E] border rounded-xl p-4 transition-all duration-200 relative
                    ${set.completed 
                      ? 'border-emerald-500/50 bg-emerald-500/5' 
                      : 'border-zinc-800 hover:border-zinc-700'
                    }
                  `}
                >
                  <div className="grid grid-cols-[50px_120px_100px_50px] gap-3 items-center">
                    {/* Set Number */}
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm ${
                        set.completed 
                          ? 'bg-emerald-500/20 text-emerald-400' 
                          : 'bg-zinc-800 text-gray-400'
                      }`}>
                        {set.set}
                      </div>
                    </div>

                    {/* Weight Input */}
                    <input
                      type="text"
                      value={set.weight}
                      onChange={(e) => updateSet(index, 'weight', e.target.value)}
                      className={`
                        bg-black border rounded-lg px-3 py-2 text-white text-center transition-all
                        focus:outline-none focus:ring-2 focus:ring-[#F56E0F]/50 focus:border-[#F56E0F]
                        ${set.completed ? 'border-emerald-500/30' : 'border-zinc-700 hover:border-zinc-600'}
                      `}
                      placeholder="--"
                      disabled={set.completed}
                    />

                    {/* Reps Input */}
                    <input
                      type="text"
                      value={set.reps}
                      onChange={(e) => updateSet(index, 'reps', e.target.value)}
                      className={`
                        bg-black border rounded-lg px-3 py-2 text-white text-center transition-all
                        focus:outline-none focus:ring-2 focus:ring-[#F56E0F]/50 focus:border-[#F56E0F]
                        ${set.completed ? 'border-emerald-500/30 text-emerald-400' : 'border-zinc-700 hover:border-zinc-600'}
                      `}
                      placeholder="--"
                      disabled={set.completed}
                    />

                    {/* Completion Checkbox */}
                    <div className="flex justify-end">
                      <button
                        onClick={() => toggleSetComplete(index)}
                        className={`
                          w-8 h-8 rounded-lg flex items-center justify-center transition-all
                          ${set.completed 
                            ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                            : 'bg-zinc-800 text-gray-500 hover:bg-zinc-700 hover:text-white'
                          }
                        `}
                      >
                        <Check className={`w-4 h-4`} />
                      </button>
                    </div>
                  </div>

                  {/* Delete Set Button */}
                  {sets.length > 1 && !set.completed && (
                    <button
                      onClick={() => deleteSet(index)}
                      className="absolute -right-2 -top-2 w-5 h-5 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white shadow-lg"
                      title="Delete Set"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Add Set Button */}
            <button
              onClick={addSet}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#1B1B1E] border border-zinc-800 text-gray-400 hover:text-[#F56E0F] hover:border-[#F56E0F]/50 transition-all"
            >
              <Plus className="w-5 h-5" />
              <span className="uppercase tracking-wider text-sm">Add Set</span>
            </button>

            {/* Notes Section - Disabled to reduce serverless function count */}
            {/* <div className="bg-[#1B1B1E] border border-zinc-800 rounded-xl p-4">
              <label className="block text-gray-400 text-sm mb-2 uppercase tracking-wider">Workout Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-black border border-zinc-700 rounded-lg px-4 py-3 text-white resize-none focus:outline-none focus:ring-2 focus:ring-[#F56E0F]/50 focus:border-[#F56E0F]"
                rows={3}
                placeholder="Add any notes about this exercise..."
              ></textarea>
            </div> */}
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-black border-t border-[#F56E0F]/20 backdrop-blur-lg">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <button
              onClick={goToPrevious}
              disabled={!hasPrevious}
              className={`
                flex-1 py-4 rounded-xl flex items-center justify-center gap-2 transition-all uppercase tracking-wider text-sm
                ${hasPrevious 
                  ? 'bg-[#1B1B1E] border border-zinc-800 text-white hover:border-[#F56E0F]/50 hover:text-[#F56E0F]' 
                  : 'bg-zinc-900 text-zinc-700 cursor-not-allowed border border-zinc-800/50'
                }
              `}
            >
              <ChevronLeft className="w-5 h-5" />
              Previous
            </button>

            <button
              onClick={goToNext}
              disabled={!hasNext && !currentExerciseAllSetsCompleted}
              className={`
                flex-1 py-4 rounded-xl flex items-center justify-center gap-2 transition-all uppercase tracking-wider text-sm
                ${(!hasNext && currentExerciseAllSetsCompleted)
                  ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/30'
                  : hasNext 
                  ? 'bg-[#F56E0F] text-white hover:bg-[#F56E0F]/90 shadow-lg shadow-[#F56E0F]/20' 
                  : 'bg-zinc-900 text-zinc-700 cursor-not-allowed border border-zinc-800/50'
                }
              `}
            >
              {!hasNext ? 'Complete Workout' : 'Next Exercise'}
              {!hasNext ? (
                <Check className="w-5 h-5" />
              ) : (
                <ChevronLeft className="w-5 h-5 rotate-180" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Celebration Animation */}
      {showCelebration && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          {/* Close button */}
          <button
            onClick={handleDismissCelebration}
            className="absolute top-4 right-4 p-3 rounded-lg bg-zinc-900/90 border border-zinc-700 text-white hover:text-white hover:bg-zinc-800 hover:border-zinc-600 transition-all z-[60]"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
          
          <div className="text-center">
            <div className="mb-4">
              <div className="w-32 h-32 mx-auto bg-emerald-500 rounded-full flex items-center justify-center animate-scale-in">
                <Check className="w-20 h-20 text-white" />
              </div>
            </div>
            <h2 className="text-5xl font-bold text-emerald-400 mb-2 animate-fade-in">
              Workout Complete!
            </h2>
            <p className="text-2xl text-white animate-fade-in-delay">
              Great job! 🎉
            </p>
          </div>
        </div>
      )}
    </div>
  );
}