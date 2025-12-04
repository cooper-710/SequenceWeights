import { useState, useEffect } from 'react';
import { ArrowLeft, Calendar, Plus, Trash2, Video, ChevronDown, ChevronRight, ChevronLeft, Pencil, GripVertical, Copy, Move, CheckSquare, X, Search, Check } from 'lucide-react';
import { workoutsApi, athletesApi, Workout, Athlete as AthleteType } from '../utils/api';
import { ExerciseAutocomplete } from './ExerciseAutocomplete';
import { WorkoutTemplateAutocomplete } from './WorkoutTemplateAutocomplete';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Athlete {
  id: string;
  name: string;
  email: string;
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

interface Exercise {
  id: string;
  name: string;
  sets: number;
  reps: string;
  weight: string;
  videoUrl?: string;
  exerciseName?: string; // Support both name and exerciseName for compatibility
}

interface PlayerWorkoutEditorProps {
  athlete: Athlete;
  onBack: () => void;
}

// Sortable Exercise Component for PlayerWorkoutEditor
function SortableExercise({
  exercise,
  index,
  onEdit,
  onRemove,
  isDraggingAny,
}: {
  exercise: Exercise;
  index: number;
  onEdit: () => void;
  onRemove: () => void;
  isDraggingAny: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: exercise.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: (isDragging || isDraggingAny) ? undefined : transition,
    opacity: isDragging ? 0 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-black/40 border border-zinc-700 rounded-lg p-3"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-2 flex-1">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-300 p-1 mt-1"
          >
            <GripVertical className="w-4 h-4" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-gray-500 text-sm">{index + 1}.</span>
              <h5 className="text-white text-sm">{exercise.name || exercise.exerciseName}</h5>
            </div>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-gray-400">Sets: </span>
                <span className="text-white">{exercise.sets}</span>
              </div>
              <div>
                <span className="text-gray-400">Reps: </span>
                <span className="text-white">{exercise.reps}</span>
              </div>
              <div>
                <span className="text-gray-400">Weight: </span>
                <span className="text-white">{exercise.weight}</span>
              </div>
            </div>
            {exercise.videoUrl && (
              <div className="flex items-center gap-1 mt-2 text-[#F56E0F] text-xs">
                <Video className="w-3 h-3" />
                <span>Video attached</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onEdit}
            className="text-gray-400 hover:text-blue-500 transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onRemove}
            className="text-gray-400 hover:text-red-500 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Sortable Block Component for PlayerWorkoutEditor
function SortableBlock({
  block,
  workoutId,
  isExpanded,
  onToggle,
  onRemove,
  exercises,
  onExerciseEdit,
  onExerciseRemove,
  onAddExercise,
  onExerciseDragEnd,
  activeExerciseId,
  setActiveExerciseId,
  isDraggingAny,
  setIsDraggingAny,
}: {
  block: Block;
  workoutId: string;
  isExpanded: boolean;
  onToggle: () => void;
  onRemove: () => void;
  exercises: Exercise[];
  onExerciseEdit: (exercise: Exercise) => void;
  onExerciseRemove: (exerciseId: string) => void;
  onAddExercise: () => void;
  onExerciseDragEnd: (event: DragEndEvent, blockId: string, workoutId: string) => void;
  activeExerciseId: string | null;
  setActiveExerciseId: (id: string | null) => void;
  isDraggingAny: boolean;
  setIsDraggingAny: (value: boolean) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const exerciseSensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: (isDragging || isDraggingAny) ? undefined : transition,
    opacity: isDragging ? 0 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="bg-black/30 border border-zinc-800 rounded-lg overflow-hidden">
      {/* Block Header */}
      <div className="p-3 flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1">
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-300 p-1"
          >
            <GripVertical className="w-4 h-4" />
          </button>
          <button
            onClick={onToggle}
            className="flex items-center gap-2 flex-1 text-left"
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-400" />
            )}
            <div>
              <h4 className="text-white">{block.name}</h4>
              <p className="text-xs text-gray-500">
                {block.exercises.length} exercise{block.exercises.length !== 1 ? 's' : ''}
              </p>
            </div>
          </button>
        </div>
        <button
          onClick={onRemove}
          className="text-gray-400 hover:text-red-500 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Exercises in Block */}
      {isExpanded && (
        <div className="border-t border-zinc-800 p-3 space-y-2">
          <DndContext
            sensors={exerciseSensors}
            collisionDetection={closestCenter}
            onDragStart={(e) => {
              setActiveExerciseId(e.active.id as string);
              setIsDraggingAny(true);
            }}
            onDragEnd={(e) => {
              onExerciseDragEnd(e, block.id, workoutId);
              setActiveExerciseId(null);
            }}
          >
            <SortableContext
              items={exercises.map((e) => e.id)}
              strategy={verticalListSortingStrategy}
            >
              {exercises.map((exercise, index) => (
                <SortableExercise
                  key={exercise.id}
                  exercise={exercise}
                  index={index}
                  onEdit={() => onExerciseEdit(exercise)}
                  onRemove={() => onExerciseRemove(exercise.id)}
                  isDraggingAny={isDraggingAny}
                />
              ))}
            </SortableContext>
            <DragOverlay>
              {activeExerciseId ? (
                <div className="bg-black/40 border border-zinc-700 rounded-lg p-3 opacity-90">
                  <div className="text-white text-sm">
                    {exercises.find((e) => e.id === activeExerciseId)?.name || exercises.find((e) => e.id === activeExerciseId)?.exerciseName || 'Exercise'}
                  </div>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>

          {/* Add Exercise to Block Button */}
          <button
            onClick={onAddExercise}
            className="w-full bg-zinc-900 border border-zinc-800 hover:border-[#F56E0F] rounded-lg p-2 flex items-center justify-center gap-2 text-gray-400 hover:text-white transition-colors text-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Exercise
          </button>
        </div>
      )}
    </div>
  );
}

export function PlayerWorkoutEditor({ athlete, onBack }: PlayerWorkoutEditorProps) {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [expandedWorkouts, setExpandedWorkouts] = useState<Set<string>>(new Set());
  const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(new Set());
  const [showWorkoutModal, setShowWorkoutModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [editingExercise, setEditingExercise] = useState<{ workoutId: string; blockId: string; exercise: Exercise } | null>(null);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [activeExerciseId, setActiveExerciseId] = useState<string | null>(null);
  const [isDraggingAny, setIsDraggingAny] = useState(false);

  // Selection mode for copy/move
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedWorkouts, setSelectedWorkouts] = useState<Set<string>>(new Set());
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [targetAthlete, setTargetAthlete] = useState<AthleteType | null>(null);
  const [targetDate, setTargetDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [copyToMultipleDates, setCopyToMultipleDates] = useState(false);
  const [selectedDays, setSelectedDays] = useState<Set<number>>(new Set());
  const [numberOfWeeks, setNumberOfWeeks] = useState<number>(4);
  const [allAthletes, setAllAthletes] = useState<AthleteType[]>([]);
  const [athleteSearch, setAthleteSearch] = useState('');
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => {
    const [year, month] = selectedDate.split('-').map(Number);
    return new Date(year, month - 1, 1);
  });
  const [copiedWorkout, setCopiedWorkout] = useState<Workout | null>(null);
  const [draggedWorkout, setDraggedWorkout] = useState<{ workout: Workout; sourceDate: string } | null>(null);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  const [workoutCompletionStatus, setWorkoutCompletionStatus] = useState<Record<string, boolean>>({});

  // Update calendar month when selected date changes
  useEffect(() => {
    const [year, month] = selectedDate.split('-').map(Number);
    const newMonth = new Date(year, month - 1, 1);
    if (calendarMonth.getTime() !== newMonth.getTime()) {
      setCalendarMonth(newMonth);
    }
  }, [selectedDate]);

  const blockSensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Load workouts for this athlete
  useEffect(() => {
    loadWorkouts();
  }, [athlete.id]);

  // Load all athletes for copy/move target selection
  useEffect(() => {
    const loadAthletes = async () => {
      try {
        const athletes = await athletesApi.getAll();
        setAllAthletes(athletes);
      } catch (err) {
        console.error('Failed to load athletes:', err);
      }
    };
    loadAthletes();
  }, []);

  // Prefill athlete search with current athlete when modal opens
  useEffect(() => {
    if (showCopyModal || showMoveModal) {
      setAthleteSearch(athlete.name);
    }
  }, [showCopyModal, showMoveModal, athlete.name]);

  const loadWorkouts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await workoutsApi.getAll({ athleteId: athlete.id });
      setWorkouts(data);
      
      // Load completion status for all workouts
      const completionStatus: Record<string, boolean> = {};
      for (const workout of data) {
        try {
          const status = await workoutsApi.getCompletionStatus(workout.id, athlete.id);
          // Check if all exercises are completed
          const allExercises = workout.blocks.flatMap(block => block.exercises);
          const isCompleted = allExercises.length > 0 && allExercises.every(exercise => {
            const exerciseName = exercise.exerciseName || (exercise as any).name || '';
            const exerciseStatus = status[exerciseName];
            return exerciseStatus?.status === 'completed';
          });
          completionStatus[workout.id] = isCompleted;
        } catch (err) {
          console.error(`Failed to load completion status for workout ${workout.id}:`, err);
          completionStatus[workout.id] = false;
        }
      }
      setWorkoutCompletionStatus(completionStatus);
    } catch (err) {
      console.error('Failed to load workouts:', err);
      setError('Failed to load workouts. Make sure the backend server is running.');
    } finally {
      setLoading(false);
    }
  };

  const toggleWorkout = (workoutId: string) => {
    const newExpanded = new Set(expandedWorkouts);
    if (newExpanded.has(workoutId)) {
      newExpanded.delete(workoutId);
    } else {
      newExpanded.add(workoutId);
    }
    setExpandedWorkouts(newExpanded);
  };

  const toggleBlock = (blockId: string) => {
    const newExpanded = new Set(expandedBlocks);
    if (newExpanded.has(blockId)) {
      newExpanded.delete(blockId);
    } else {
      newExpanded.add(blockId);
    }
    setExpandedBlocks(newExpanded);
  };

  const handleAddWorkout = async (workout: Omit<Workout, 'id' | 'blocks'> | Workout) => {
    try {
      // If workout has blocks, it's from a template - use them, otherwise start empty
      const blocks = 'blocks' in workout && workout.blocks ? workout.blocks : [];
      
      const newWorkout = await workoutsApi.create({
        name: workout.name,
        date: selectedDate, // Always use the selected date, not the template's date
        athleteId: athlete.id,
        blocks: blocks,
      });
      setWorkouts([...workouts, newWorkout]);
      setShowWorkoutModal(false);
      setExpandedWorkouts(new Set([...expandedWorkouts, newWorkout.id]));
      
      // Expand all blocks in the new workout
      if (newWorkout.blocks.length > 0) {
        const blockIds = new Set(newWorkout.blocks.map(b => b.id));
        setExpandedBlocks(new Set([...expandedBlocks, ...blockIds]));
      }
    } catch (err: any) {
      console.error('Failed to create workout:', err);
      alert(err.message || 'Failed to create workout. Please try again.');
    }
  };

  const handleRemoveWorkout = async (workoutId: string) => {
    if (!confirm('Are you sure you want to delete this workout?')) {
      return;
    }
    try {
      await workoutsApi.delete(workoutId);
      setWorkouts(workouts.filter((w) => w.id !== workoutId));
    } catch (err: any) {
      console.error('Failed to delete workout:', err);
      alert(err.message || 'Failed to delete workout. Please try again.');
    }
  };

  const handleAddBlock = async (blockName: string) => {
    if (!selectedWorkoutId) return;
    const workout = workouts.find(w => w.id === selectedWorkoutId);
    if (!workout) return;
    
    const newBlock: Block = {
      id: Date.now().toString(),
      name: blockName,
      exercises: [],
    };
    
    const updatedWorkout = {
      ...workout,
      blocks: [...workout.blocks, newBlock],
    };
    
    try {
      const saved = await workoutsApi.update(workout.id, updatedWorkout);
      setWorkouts(workouts.map(w => w.id === workout.id ? saved : w));
      setExpandedBlocks(new Set([...expandedBlocks, newBlock.id]));
      setShowBlockModal(false);
    } catch (err: any) {
      console.error('Failed to add block:', err);
      alert(err.message || 'Failed to add block. Please try again.');
    }
  };

  const handleRemoveBlock = async (workoutId: string, blockId: string) => {
    const workout = workouts.find(w => w.id === workoutId);
    if (!workout) return;
    
    const updatedWorkout = {
      ...workout,
      blocks: workout.blocks.filter((b) => b.id !== blockId),
    };
    
    try {
      const saved = await workoutsApi.update(workoutId, updatedWorkout);
      setWorkouts(workouts.map(w => w.id === workoutId ? saved : w));
    } catch (err: any) {
      console.error('Failed to remove block:', err);
      alert(err.message || 'Failed to remove block. Please try again.');
    }
  };

  const handleAddExercise = async (exercise: Exercise) => {
    if (!selectedWorkoutId || !selectedBlockId) return;
    const workout = workouts.find(w => w.id === selectedWorkoutId);
    if (!workout) return;
    
    // Convert Exercise to WorkoutExercise format (API expects exerciseName, not name)
    const workoutExercise = {
      id: exercise.id,
      exerciseName: exercise.name || exercise.exerciseName || '',
      sets: exercise.sets,
      reps: exercise.reps,
      weight: exercise.weight,
    };
    
    const updatedWorkout = {
      ...workout,
      blocks: workout.blocks.map((block) =>
        block.id === selectedBlockId
          ? { ...block, exercises: [...block.exercises, workoutExercise] }
          : block
      ),
    };
    
    try {
      const saved = await workoutsApi.update(selectedWorkoutId, updatedWorkout);
      setWorkouts(workouts.map(w => w.id === selectedWorkoutId ? saved : w));
      setShowExerciseModal(false);
    } catch (err: any) {
      console.error('Failed to add exercise:', err);
      alert(err.message || 'Failed to add exercise. Please try again.');
    }
  };

  const handleRemoveExercise = async (workoutId: string, blockId: string, exerciseId: string) => {
    const workout = workouts.find(w => w.id === workoutId);
    if (!workout) return;
    
    const updatedWorkout = {
      ...workout,
      blocks: workout.blocks.map((block) =>
        block.id === blockId
          ? { ...block, exercises: block.exercises.filter((ex) => ex.id !== exerciseId) }
          : block
      ),
    };
    
    try {
      const saved = await workoutsApi.update(workoutId, updatedWorkout);
      setWorkouts(workouts.map(w => w.id === workoutId ? saved : w));
    } catch (err: any) {
      console.error('Failed to remove exercise:', err);
      alert(err.message || 'Failed to remove exercise. Please try again.');
    }
  };

  const handleEditExercise = async (workoutId: string, blockId: string, updatedExercise: Exercise) => {
    const workout = workouts.find(w => w.id === workoutId);
    if (!workout) return;
    
    // Convert Exercise to WorkoutExercise format
    const workoutExercise = {
      id: updatedExercise.id,
      exerciseName: updatedExercise.name || updatedExercise.exerciseName || '',
      sets: updatedExercise.sets,
      reps: updatedExercise.reps,
      weight: updatedExercise.weight,
    };
    
    const updatedWorkout = {
      ...workout,
      blocks: workout.blocks.map((block) =>
        block.id === blockId
          ? {
              ...block,
              exercises: block.exercises.map((ex) =>
                ex.id === updatedExercise.id ? workoutExercise : ex
              ),
            }
          : block
      ),
    };
    
    try {
      const saved = await workoutsApi.update(workoutId, updatedWorkout);
      setWorkouts(workouts.map(w => w.id === workoutId ? saved : w));
      setEditingExercise(null);
      setShowExerciseModal(false);
    } catch (err: any) {
      console.error('Failed to update exercise:', err);
      alert(err.message || 'Failed to update exercise. Please try again.');
    }
  };

  const filteredWorkouts = workouts.filter((workout) => workout.date === selectedDate);

  const getTotalExerciseCount = (workout: Workout) => {
    return workout.blocks.reduce((total, block) => total + block.exercises.length, 0);
  };

  // Calendar helper functions
  const formatLocalDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const parseLocalDate = (dateStr: string): Date => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];

    // Start week on Sunday (0 = Sunday, 1 = Monday, etc.)
    const startDayOfWeek = firstDay.getDay();
    const offset = startDayOfWeek; // Sunday=0, so offset is just the day of week

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < offset; i++) {
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
    return workouts.some(w => w.date === dateStr);
  };

  const isWorkoutCompleted = (date: Date | null) => {
    if (!date) return false;
    const dateStr = formatLocalDate(date);
    const workout = workouts.find(w => w.date === dateStr);
    if (!workout) return false;
    return workoutCompletionStatus[workout.id] === true;
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

  const isSelected = (date: Date | null) => {
    if (!date) return false;
    const selected = parseLocalDate(selectedDate);
    return (
      date.getDate() === selected.getDate() &&
      date.getMonth() === selected.getMonth() &&
      date.getFullYear() === selected.getFullYear()
    );
  };

  const handleCalendarDateClick = (date: Date | null) => {
    if (date) {
      setSelectedDate(formatLocalDate(date));
    }
  };

  const handleCalendarDragOver = (e: React.DragEvent, date: Date | null) => {
    if (date && draggedWorkout) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      const dateStr = formatLocalDate(date);
      setDragOverDate(dateStr);
    }
  };

  const handleCalendarDragLeave = () => {
    setDragOverDate(null);
  };

  const handleCalendarDrop = async (e: React.DragEvent, targetDate: Date | null) => {
    e.preventDefault();
    setDragOverDate(null);
    if (!targetDate || !draggedWorkout) return;

    const targetDateStr = formatLocalDate(targetDate);
    
    try {
      // Update workout date
      await workoutsApi.update(draggedWorkout.workout.id, {
        ...draggedWorkout.workout,
        date: targetDateStr,
      });
      
      // Reload workouts
      await loadWorkouts();
      setSelectedDate(targetDateStr);
      setDraggedWorkout(null);
    } catch (err: any) {
      console.error('Failed to move workout:', err);
      alert(err.message || 'Failed to move workout. Please try again.');
      setDraggedWorkout(null);
    }
  };

  const handleWorkoutDragStart = (workout: Workout) => {
    setDraggedWorkout({ workout, sourceDate: workout.date });
  };

  const handleWorkoutDragEnd = () => {
    setDraggedWorkout(null);
    setDragOverDate(null);
  };

  const handleCopyWorkout = (workout: Workout) => {
    setCopiedWorkout(workout);
  };

  const handlePasteWorkout = async (targetDate: Date | null) => {
    if (!targetDate || !copiedWorkout) return;

    const targetDateStr = formatLocalDate(targetDate);
    
    try {
      await workoutsApi.create({
        name: copiedWorkout.name,
        date: targetDateStr,
        athleteId: athlete.id,
        blocks: copiedWorkout.blocks,
      });
      
      await loadWorkouts();
      setSelectedDate(targetDateStr);
    } catch (err: any) {
      console.error('Failed to paste workout:', err);
      alert(err.message || 'Failed to paste workout. Please try again.');
    }
  };

  const handleBlockDragEnd = async (event: DragEndEvent, workoutId: string) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) {
      setActiveBlockId(null);
      setIsDraggingAny(false);
      return;
    }

    const workout = workouts.find(w => w.id === workoutId);
    if (!workout) {
      setActiveBlockId(null);
      setIsDraggingAny(false);
      return;
    }

    const oldIndex = workout.blocks.findIndex((b) => b.id === active.id);
    const newIndex = workout.blocks.findIndex((b) => b.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const updatedWorkout = {
        ...workout,
        blocks: arrayMove(workout.blocks, oldIndex, newIndex),
      };
      
      // Update state IMMEDIATELY (optimistically) before API call to prevent double animation
      setWorkouts(workouts.map(w => w.id === workoutId ? updatedWorkout : w));
      setActiveBlockId(null);
      setIsDraggingAny(false);
      
      // Then update via API in the background
      try {
        const saved = await workoutsApi.update(workoutId, updatedWorkout);
        setWorkouts(workouts.map(w => w.id === workoutId ? saved : w));
      } catch (err: any) {
        console.error('Failed to reorder blocks:', err);
        // Revert on error
        setWorkouts(workouts.map(w => w.id === workoutId ? workout : w));
        alert(err.message || 'Failed to reorder blocks. Please try again.');
      }
    } else {
      setActiveBlockId(null);
      setIsDraggingAny(false);
    }
  };

  const handleExerciseDragEnd = async (event: DragEndEvent, blockId: string, workoutId: string) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) {
      setIsDraggingAny(false);
      return;
    }

    const workout = workouts.find(w => w.id === workoutId);
    if (!workout) {
      setIsDraggingAny(false);
      return;
    }

    const block = workout.blocks.find((b) => b.id === blockId);
    if (!block) {
      setIsDraggingAny(false);
      return;
    }

    const oldIndex = block.exercises.findIndex((e) => e.id === active.id);
    const newIndex = block.exercises.findIndex((e) => e.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const updatedWorkout = {
        ...workout,
        blocks: workout.blocks.map((b) =>
          b.id === blockId
            ? { ...b, exercises: arrayMove(b.exercises, oldIndex, newIndex) }
            : b
        ),
      };
      
      // Update state IMMEDIATELY (optimistically) before API call to prevent double animation
      setWorkouts(workouts.map(w => w.id === workoutId ? updatedWorkout : w));
      setIsDraggingAny(false);
      
      // Then update via API in the background
      try {
        const saved = await workoutsApi.update(workoutId, updatedWorkout);
        setWorkouts(workouts.map(w => w.id === workoutId ? saved : w));
      } catch (err: any) {
        console.error('Failed to reorder exercises:', err);
        // Revert on error
        setWorkouts(workouts.map(w => w.id === workoutId ? workout : w));
        alert(err.message || 'Failed to reorder exercises. Please try again.');
      }
    } else {
      setIsDraggingAny(false);
    }
  };

  const handleBlockDragStart = (event: DragStartEvent) => {
    setActiveBlockId(event.active.id as string);
    setIsDraggingAny(true);
  };

  // Copy workouts handler
  const handleCopyWorkouts = async () => {
    if (selectedWorkouts.size === 0 || !targetAthlete) return;

    try {
      const workoutsToCopy = workouts.filter(w => selectedWorkouts.has(w.id));
      
      if (copyToMultipleDates && selectedDays.size > 0) {
        // Copy to recurring weekly pattern
        const startDate = new Date(targetDate + 'T00:00:00'); // Use local time to avoid timezone issues
        const dates: string[] = [];
        
        // Generate dates for selected days of week for specified number of weeks
        selectedDays.forEach(dayOfWeek => {
          // Get the day of week for the start date (0 = Sunday, 1 = Monday, etc.)
          const startDayOfWeek = startDate.getDay();
          
          // Calculate days to add to get to the first occurrence of the target day
          let daysToFirstOccurrence = dayOfWeek - startDayOfWeek;
          
          // If the target day has already passed this week (negative), go to next week
          if (daysToFirstOccurrence < 0) {
            daysToFirstOccurrence += 7;
          }
          // If daysToFirstOccurrence is 0, we're already on the target day
          
          // Generate dates for each week
          for (let week = 0; week < numberOfWeeks; week++) {
            // Create a fresh date for each calculation
            const date = new Date(startDate);
            
            // Calculate total days to add: first occurrence + week offset
            const totalDaysToAdd = daysToFirstOccurrence + (week * 7);
            date.setDate(date.getDate() + totalDaysToAdd);
            
            // Format as YYYY-MM-DD (local date, not UTC)
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            dates.push(`${year}-${month}-${day}`);
          }
        });

        // Sort dates chronologically
        dates.sort();

        for (const workout of workoutsToCopy) {
          for (const date of dates) {
            await workoutsApi.create({
              name: workout.name,
              date: date,
              athleteId: targetAthlete.id,
              blocks: workout.blocks,
            });
          }
        }
      } else {
        // Copy to single date
        for (const workout of workoutsToCopy) {
          await workoutsApi.create({
            name: workout.name,
            date: targetDate,
            athleteId: targetAthlete.id,
            blocks: workout.blocks,
          });
        }
      }

      // Reset selection
      setSelectedWorkouts(new Set());
      setSelectionMode(false);
      setShowCopyModal(false);
      setTargetAthlete(null);
      setTargetDate(new Date().toISOString().split('T')[0]);
      setCopyToMultipleDates(false);
      setSelectedDays(new Set());
      setNumberOfWeeks(4);

      // Reload workouts if copying to same athlete
      if (targetAthlete.id === athlete.id) {
        await loadWorkouts();
      }
    } catch (err: any) {
      console.error('Failed to copy workouts:', err);
      alert(err.message || 'Failed to copy workouts. Please try again.');
    }
  };

  // Move workouts handler
  const handleMoveWorkouts = async () => {
    if (selectedWorkouts.size === 0 || !targetAthlete) return;

    try {
      const workoutsToMove = workouts.filter(w => selectedWorkouts.has(w.id));
      
      for (const workout of workoutsToMove) {
        // Update workout with new athlete and date
        await workoutsApi.update(workout.id, {
          name: workout.name,
          date: targetDate,
          athleteId: targetAthlete.id,
          blocks: workout.blocks,
        });
      }

      // Reset selection
      setSelectedWorkouts(new Set());
      setSelectionMode(false);
      setShowMoveModal(false);
      setTargetAthlete(null);
      setTargetDate(new Date().toISOString().split('T')[0]);

      // Reload workouts
      await loadWorkouts();
    } catch (err: any) {
      console.error('Failed to move workouts:', err);
      alert(err.message || 'Failed to move workouts. Please try again.');
    }
  };

  return (
    <div>
      {/* Back Button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6"
      >
        <ArrowLeft className="w-5 h-5" />
        Back to Athletes
      </button>

      {/* Player Header */}
      <div className="bg-[#1B1B1E] border border-[#262626] rounded-lg p-6 mb-6">
        <h2 className="text-white text-2xl mb-2">{athlete.name}</h2>
        <p className="text-gray-400">{athlete.email}</p>
      </div>

      {/* Date Selector & Add Workout */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Calendar className="w-5 h-5 text-gray-400 flex-shrink-0" />
          <div className="relative flex-1 min-w-0">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full bg-[#1B1B1E] border border-[#262626] rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#F56E0F] cursor-pointer appearance-none pr-10 touch-manipulation"
              style={{
                colorScheme: 'dark',
              }}
            />
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
        
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {selectionMode ? (
            <>
              <button
                onClick={() => {
                  setSelectionMode(false);
                  setSelectedWorkouts(new Set());
                }}
                className="px-4 py-2.5 text-gray-400 hover:text-white active:bg-zinc-800 transition-colors rounded-lg touch-manipulation min-h-[44px]"
              >
                Cancel
              </button>
              <span className="text-sm text-gray-400 px-2 hidden sm:inline">
                {selectedWorkouts.size} selected
              </span>
              <button
                onClick={() => setShowCopyModal(true)}
                disabled={selectedWorkouts.size === 0}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-zinc-800 disabled:text-gray-600 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-lg transition-colors touch-manipulation min-h-[44px]"
              >
                <Copy className="w-4 h-4" />
                <span className="hidden sm:inline">Copy</span>
              </button>
              <button
                onClick={() => setShowMoveModal(true)}
                disabled={selectedWorkouts.size === 0}
                className="flex items-center gap-2 bg-[#F56E0F] hover:bg-[#E05D00] active:bg-[#D04C00] disabled:bg-zinc-800 disabled:text-gray-600 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-lg transition-colors touch-manipulation min-h-[44px]"
              >
                <Move className="w-4 h-4" />
                <span className="hidden sm:inline">Move</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setSelectionMode(true)}
                className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 text-gray-300 px-4 py-2.5 rounded-lg transition-colors touch-manipulation min-h-[44px]"
              >
                <CheckSquare className="w-4 h-4" />
                <span className="hidden sm:inline">Select</span>
              </button>
              <button
                onClick={() => setShowWorkoutModal(true)}
                className="flex items-center justify-center gap-2 bg-[#F56E0F] hover:bg-[#E05D00] active:bg-[#D04C00] text-white px-4 py-2.5 rounded-lg transition-colors touch-manipulation min-h-[44px] flex-1 sm:flex-initial"
              >
                <Plus className="w-5 h-5" />
                <span>Add Workout</span>
              </button>
            </>
          )}
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-white">Loading workouts...</div>
        </div>
      )}

      {error && (
        <div className="bg-red-500/10 border border-red-500 rounded-lg p-6">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={loadWorkouts}
            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* Workouts List */}
      {!loading && !error && (
        <div className="space-y-4">
          {filteredWorkouts.length === 0 ? (
            <div className="bg-[#1B1B1E] border border-[#262626] rounded-lg p-8 text-center">
              <p className="text-gray-400 mb-4">No workouts scheduled for this date</p>
              <button
                onClick={() => setShowWorkoutModal(true)}
                className="inline-flex items-center justify-center gap-2 bg-[#F56E0F] hover:bg-[#E05D00] active:bg-[#D04C00] text-white px-6 py-3 rounded-lg transition-colors touch-manipulation min-h-[44px]"
              >
                <Plus className="w-5 h-5" />
                <span>Add a workout to get started</span>
              </button>
            </div>
          ) : (
          filteredWorkouts.map((workout) => (
            <div
              key={workout.id}
              draggable={!selectionMode}
              onDragStart={() => !selectionMode && handleWorkoutDragStart(workout)}
              onDragEnd={handleWorkoutDragEnd}
              className={`bg-[#1B1B1E] border rounded-lg overflow-hidden transition-all ${
                selectedWorkouts.has(workout.id)
                  ? 'border-[#F56E0F] bg-[#F56E0F]/10'
                  : 'border-[#262626]'
              } ${!selectionMode ? 'cursor-move' : ''}`}
            >
              {/* Workout Header */}
              <div 
                className={`p-4 flex items-center justify-between gap-3 ${selectionMode ? 'cursor-pointer' : ''}`}
                onClick={(e) => {
                  if (selectionMode) {
                    // Prevent checkbox from double-toggling
                    if ((e.target as HTMLElement).tagName === 'INPUT') {
                      return;
                    }
                    const newSelected = new Set(selectedWorkouts);
                    if (selectedWorkouts.has(workout.id)) {
                      newSelected.delete(workout.id);
                    } else {
                      newSelected.add(workout.id);
                    }
                    setSelectedWorkouts(newSelected);
                  }
                }}
              >
                {selectionMode && (
                  <input
                    type="checkbox"
                    checked={selectedWorkouts.has(workout.id)}
                    onChange={(e) => {
                      e.stopPropagation();
                      const newSelected = new Set(selectedWorkouts);
                      if (e.target.checked) {
                        newSelected.add(workout.id);
                      } else {
                        newSelected.delete(workout.id);
                      }
                      setSelectedWorkouts(newSelected);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-5 h-5 rounded border-zinc-700 bg-black text-[#F56E0F] focus:ring-[#F56E0F] cursor-pointer flex-shrink-0 pointer-events-auto"
                  />
                )}
                {selectionMode ? (
                  <div className="flex items-center gap-3 flex-1 text-left">
                    <div>
                      <h3 className="text-white text-lg">{workout.name}</h3>
                      <p className="text-sm text-gray-400">
                        {workout.blocks.length} block{workout.blocks.length !== 1 ? 's' : ''} • {getTotalExerciseCount(workout)} exercise{getTotalExerciseCount(workout) !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleWorkout(workout.id);
                    }}
                    className="flex items-center gap-3 flex-1 text-left"
                  >
                    {expandedWorkouts.has(workout.id) ? (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    )}
                    <div>
                      <h3 className="text-white text-lg">{workout.name}</h3>
                      <p className="text-sm text-gray-400">
                        {workout.blocks.length} block{workout.blocks.length !== 1 ? 's' : ''} • {getTotalExerciseCount(workout)} exercise{getTotalExerciseCount(workout) !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </button>
                )}
                {!selectionMode && (
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyWorkout(workout);
                      }}
                      className="text-gray-400 hover:text-blue-500 transition-colors flex-shrink-0"
                      title="Copy workout (right-click calendar date to paste)"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveWorkout(workout.id);
                      }}
                      className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>

              {/* Blocks */}
              {expandedWorkouts.has(workout.id) && (
                <div className="border-t border-[#262626] p-4">
                  <DndContext
                    sensors={blockSensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleBlockDragStart}
                    onDragEnd={(e) => handleBlockDragEnd(e, workout.id)}
                  >
                    <SortableContext
                      items={workout.blocks.map((b) => b.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-3">
                        {workout.blocks.map((block) => (
                          <SortableBlock
                            key={block.id}
                            block={block}
                            workoutId={workout.id}
                            isExpanded={expandedBlocks.has(block.id)}
                            onToggle={() => toggleBlock(block.id)}
                            onRemove={() => handleRemoveBlock(workout.id, block.id)}
                            exercises={block.exercises}
                            onExerciseEdit={(exercise) => {
                              setEditingExercise({ workoutId: workout.id, blockId: block.id, exercise });
                              setShowExerciseModal(true);
                            }}
                            onExerciseRemove={(exerciseId) => handleRemoveExercise(workout.id, block.id, exerciseId)}
                            onAddExercise={() => {
                              setSelectedWorkoutId(workout.id);
                              setSelectedBlockId(block.id);
                              setShowExerciseModal(true);
                            }}
                            onExerciseDragEnd={handleExerciseDragEnd}
                            activeExerciseId={activeExerciseId}
                            setActiveExerciseId={setActiveExerciseId}
                            isDraggingAny={isDraggingAny}
                            setIsDraggingAny={setIsDraggingAny}
                          />
                        ))}
                      </div>
                    </SortableContext>
                    <DragOverlay>
                      {activeBlockId ? (
                        <div className="bg-black/30 border border-zinc-800 rounded-lg p-3 opacity-90">
                          <div className="text-white">
                            {workout.blocks.find((b) => b.id === activeBlockId)?.name || 'Block'}
                          </div>
                        </div>
                      ) : null}
                    </DragOverlay>
                  </DndContext>

                  {/* Add Block Button */}
                  <button
                    onClick={() => {
                      setSelectedWorkoutId(workout.id);
                      setShowBlockModal(true);
                    }}
                    className="w-full mt-3 bg-zinc-900 border border-zinc-800 hover:border-[#F56E0F] rounded-lg p-3 flex items-center justify-center gap-2 text-gray-400 hover:text-white transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Block
                  </button>
                </div>
              )}
            </div>
            ))
          )}
        </div>
      )}

      {/* Calendar View */}
      {!loading && !error && (
        <div className="mt-8">
          <h3 className="text-white text-lg mb-4">Calendar</h3>
          <div className="bg-[#1B1B1E] border border-[#262626] rounded-lg p-4">
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-white">
                {calendarMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h4>
              <div className="flex gap-2">
                <button
                  onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}
                  className="text-gray-400 hover:text-white px-2 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}
                  className="text-gray-400 hover:text-white px-2 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
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

              {getDaysInMonth(calendarMonth).map((date, index) => {
                const hasW = hasWorkout(date);
                const completed = isWorkoutCompleted(date);
                const today = isToday(date);
                const selected = isSelected(date);
                const dateStr = date ? formatLocalDate(date) : null;
                const isDragOver = dateStr && dragOverDate === dateStr && draggedWorkout;

                let className = 'aspect-square flex items-center justify-center rounded-lg text-sm transition-colors cursor-pointer relative';
                
                if (date) {
                  if (isDragOver) {
                    className += ' bg-blue-600/50 border-2 border-blue-400 text-white font-medium ring-2 ring-blue-400';
                  } else if (selected) {
                    // Selected date - show green border if completed, otherwise white
                    if (completed) {
                      className += ' bg-amber-800/60 border-4 border-green-500 text-white font-medium hover:bg-amber-800/70';
                    } else {
                      className += ' bg-amber-800/60 border-4 border-white text-white font-medium hover:bg-amber-800/70';
                    }
                  } else if (today) {
                    if (completed) {
                      className += ' bg-green-500/30 border-2 border-green-500 text-white font-medium hover:bg-green-500/40';
                    } else {
                      className += ' bg-[#F56E0F]/30 border border-[#F56E0F] text-white font-medium hover:bg-[#F56E0F]/40';
                    }
                  } else if (hasW) {
                    if (completed) {
                      className += ' bg-transparent border-2 border-green-500 text-white hover:bg-zinc-800/50';
                    } else {
                      className += ' bg-transparent border border-[#F56E0F] text-white hover:bg-zinc-800/50';
                    }
                  } else {
                    className += ' text-gray-400 hover:bg-zinc-800/50';
                  }
                } else {
                  className += ' text-transparent pointer-events-none';
                }

                return (
                  <div
                    key={index}
                    onClick={() => handleCalendarDateClick(date)}
                    onDragOver={(e) => handleCalendarDragOver(e, date)}
                    onDragLeave={handleCalendarDragLeave}
                    onDrop={(e) => handleCalendarDrop(e, date)}
                    className={className}
                    style={
                      selected && date && completed 
                        ? { border: '4px solid rgb(34, 197, 94)', boxShadow: '0 0 0 1px rgba(34, 197, 94, 0.1)' }
                        : selected && date && !completed
                        ? { border: '4px solid white', boxShadow: '0 0 0 1px rgba(255, 255, 255, 0.1)' }
                        : completed && hasW && date
                        ? { border: '2px solid rgb(34, 197, 94)' }
                        : undefined
                    }
                    onContextMenu={(e) => {
                      if (date && copiedWorkout) {
                        e.preventDefault();
                        handlePasteWorkout(date);
                      }
                    }}
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

            {copiedWorkout && (
              <div className="mt-4 pt-4 border-t border-[#262626] text-xs text-[#F56E0F]">
                Workout copied - Right-click date to paste
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Workout Modal */}
      {showWorkoutModal && (
        <AddWorkoutModal
          selectedDate={selectedDate}
          onAdd={handleAddWorkout}
          onClose={() => setShowWorkoutModal(false)}
        />
      )}

      {/* Add Block Modal */}
      {showBlockModal && (
        <AddBlockModal
          onAdd={handleAddBlock}
          onClose={() => setShowBlockModal(false)}
        />
      )}

      {/* Add Exercise Modal */}
      {showExerciseModal && (
        <AddExerciseModal
          onAdd={handleAddExercise}
          onEdit={handleEditExercise}
          editingExercise={editingExercise}
          onClose={() => {
            setShowExerciseModal(false);
            setEditingExercise(null);
          }}
        />
      )}

      {/* Copy Workout Modal */}
      {showCopyModal && (
        <CopyMoveModal
          mode="copy"
          selectedCount={selectedWorkouts.size}
          onConfirm={handleCopyWorkouts}
          onClose={() => {
            setShowCopyModal(false);
          setTargetAthlete(null);
          setTargetDate(new Date().toISOString().split('T')[0]);
          setCopyToMultipleDates(false);
          setSelectedDays(new Set());
          setNumberOfWeeks(4);
          }}
          targetAthlete={targetAthlete}
          setTargetAthlete={setTargetAthlete}
          targetDate={targetDate}
          setTargetDate={setTargetDate}
          copyToMultipleDates={copyToMultipleDates}
          setCopyToMultipleDates={setCopyToMultipleDates}
          selectedDays={selectedDays}
          setSelectedDays={setSelectedDays}
          numberOfWeeks={numberOfWeeks}
          setNumberOfWeeks={setNumberOfWeeks}
          allAthletes={allAthletes}
          athleteSearch={athleteSearch}
          setAthleteSearch={setAthleteSearch}
        />
      )}

      {/* Move Workout Modal */}
      {showMoveModal && (
        <CopyMoveModal
          mode="move"
          selectedCount={selectedWorkouts.size}
          onConfirm={handleMoveWorkouts}
          onClose={() => {
            setShowMoveModal(false);
            setTargetAthlete(null);
            setTargetDate(new Date().toISOString().split('T')[0]);
          }}
          targetAthlete={targetAthlete}
          setTargetAthlete={setTargetAthlete}
          targetDate={targetDate}
          setTargetDate={setTargetDate}
          copyToMultipleDates={false}
          setCopyToMultipleDates={() => {}}
          selectedDays={new Set()}
          setSelectedDays={() => {}}
          numberOfWeeks={4}
          setNumberOfWeeks={() => {}}
          allAthletes={allAthletes}
          athleteSearch={athleteSearch}
          setAthleteSearch={setAthleteSearch}
        />
      )}
    </div>
  );
}

interface AddWorkoutModalProps {
  selectedDate: string;
  onAdd: (workout: Omit<Workout, 'id' | 'blocks'> | Workout) => void;
  onClose: () => void;
}

function AddWorkoutModal({ selectedDate, onAdd, onClose }: AddWorkoutModalProps) {
  const [workoutName, setWorkoutName] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<Workout | null>(null);

  const handleTemplateSelect = (template: Workout) => {
    setWorkoutName(template.name);
    setSelectedTemplate(template);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedTemplate) {
      // Apply template - include blocks and exercises
      onAdd({
        ...selectedTemplate,
        date: selectedDate, // Use the selected date
      });
    } else {
      // Manual entry - start with empty blocks
      onAdd({
        name: workoutName,
        date: selectedDate,
      });
    }
    
    // Reset form
    setWorkoutName('');
    setSelectedTemplate(null);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-[#1B1B1E] border border-[#262626] rounded-lg p-6 w-full max-w-md">
        <h3 className="text-white text-xl mb-4">Add Workout</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-400 mb-2">Workout Name</label>
            <WorkoutTemplateAutocomplete
              value={workoutName}
              onChange={setWorkoutName}
              onSelectTemplate={handleTemplateSelect}
              placeholder="e.g., Upper Body Strength"
              className="w-full bg-black border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#F56E0F]"
            />
            {selectedTemplate && (
              <div className="mt-2 text-sm text-gray-400">
                Template selected: {selectedTemplate.blocks.length} block{selectedTemplate.blocks.length !== 1 ? 's' : ''} with {' '}
                {selectedTemplate.blocks.reduce((total, block) => total + block.exercises.length, 0)} exercises
              </div>
            )}
          </div>
          <div>
            <label className="block text-gray-400 mb-2">Date</label>
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-white">
              {(() => {
                const [year, month, day] = selectedDate.split('-').map(Number);
                const date = new Date(year, month - 1, day);
                return date.toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                });
              })()}
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600 text-white py-3 rounded-lg transition-colors touch-manipulation min-h-[44px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-[#F56E0F] hover:bg-[#E05D00] active:bg-[#D04C00] text-white py-3 rounded-lg transition-colors touch-manipulation min-h-[44px]"
            >
              Add Workout
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface AddBlockModalProps {
  onAdd: (blockName: string) => void;
  onClose: () => void;
}

function AddBlockModal({ onAdd, onClose }: AddBlockModalProps) {
  const [blockName, setBlockName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd(blockName);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-[#1B1B1E] border border-[#262626] rounded-lg p-6 w-full max-w-md">
        <h3 className="text-white text-xl mb-4">Add Block</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-400 mb-2">Block Name</label>
            <input
              type="text"
              value={blockName}
              onChange={(e) => setBlockName(e.target.value)}
              className="w-full bg-black border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#F56E0F]"
              placeholder="e.g., Superset A, Main Lift, Warm-up"
              required
              autoFocus
            />
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3">
            <p className="text-gray-400 text-sm">
              Blocks help organize exercises into groups like supersets, circuits, or different phases of your workout.
            </p>
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-2 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-[#F56E0F] hover:bg-[#E05D00] text-white py-2 rounded-lg transition-colors"
            >
              Add Block
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface AddExerciseModalProps {
  onAdd: (exercise: Exercise) => void;
  onEdit: (workoutId: string, blockId: string, updatedExercise: Exercise) => void;
  editingExercise: { workoutId: string; blockId: string; exercise: Exercise } | null;
  onClose: () => void;
}

function AddExerciseModal({ onAdd, onEdit, editingExercise, onClose }: AddExerciseModalProps) {
  const [formData, setFormData] = useState({
    name: editingExercise?.exercise.name || editingExercise?.exercise.exerciseName || '',
    sets: editingExercise?.exercise.sets || 3,
    reps: editingExercise?.exercise.reps || '8-10',
    weight: editingExercise?.exercise.weight || '',
    videoUrl: editingExercise?.exercise.videoUrl || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingExercise) {
      onEdit(editingExercise.workoutId, editingExercise.blockId, {
        id: editingExercise.exercise.id,
        ...formData,
      });
    } else {
      onAdd({
        id: Date.now().toString(),
        ...formData,
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-[#1B1B1E] border border-[#262626] rounded-lg p-6 w-full max-w-md">
        <h3 className="text-white text-xl mb-4">{editingExercise ? 'Edit Exercise' : 'Add Exercise'}</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-400 mb-2">Exercise Name</label>
            <ExerciseAutocomplete
              value={formData.name}
              onChange={(value) => setFormData({ ...formData, name: value })}
              placeholder="Exercise name"
              className="w-full bg-black border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#F56E0F]"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-400 mb-2">Sets</label>
              <input
                type="number"
                value={formData.sets}
                onChange={(e) => setFormData({ ...formData, sets: parseInt(e.target.value) })}
                className="w-full bg-black border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#F56E0F]"
                required
                min="1"
              />
            </div>
            <div>
              <label className="block text-gray-400 mb-2">Reps</label>
              <input
                type="text"
                value={formData.reps}
                onChange={(e) => setFormData({ ...formData, reps: e.target.value })}
                className="w-full bg-black border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#F56E0F]"
                placeholder="e.g., 8-10"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-gray-400 mb-2">Weight</label>
            <input
              type="text"
              value={formData.weight}
              onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
              className="w-full bg-black border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#F56E0F]"
              placeholder="e.g., 185 lbs"
            />
          </div>
          <div>
            <label className="block text-gray-400 mb-2">Video URL (optional)</label>
            <input
              type="url"
              value={formData.videoUrl}
              onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
              className="w-full bg-black border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#F56E0F]"
              placeholder="https://..."
            />
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-2 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-[#F56E0F] hover:bg-[#E05D00] text-white py-2 rounded-lg transition-colors"
            >
              {editingExercise ? 'Save' : 'Add Exercise'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface CopyMoveModalProps {
  mode: 'copy' | 'move';
  selectedCount: number;
  onConfirm: () => void;
  onClose: () => void;
  targetAthlete: AthleteType | null;
  setTargetAthlete: (athlete: AthleteType | null) => void;
  targetDate: string;
  setTargetDate: (date: string) => void;
  copyToMultipleDates: boolean;
  setCopyToMultipleDates: (value: boolean) => void;
  selectedDays: Set<number>;
  setSelectedDays: (days: Set<number>) => void;
  numberOfWeeks: number;
  setNumberOfWeeks: (weeks: number) => void;
  allAthletes: AthleteType[];
  athleteSearch: string;
  setAthleteSearch: (search: string) => void;
}

function CopyMoveModal({
  mode,
  selectedCount,
  onConfirm,
  onClose,
  targetAthlete,
  setTargetAthlete,
  targetDate,
  setTargetDate,
  copyToMultipleDates,
  setCopyToMultipleDates,
  selectedDays,
  setSelectedDays,
  numberOfWeeks,
  setNumberOfWeeks,
  allAthletes,
  athleteSearch,
  setAthleteSearch,
}: CopyMoveModalProps) {
  const weekDays = [
    { value: 0, label: 'Sunday', short: 'Sun' },
    { value: 1, label: 'Monday', short: 'Mon' },
    { value: 2, label: 'Tuesday', short: 'Tue' },
    { value: 3, label: 'Wednesday', short: 'Wed' },
    { value: 4, label: 'Thursday', short: 'Thu' },
    { value: 5, label: 'Friday', short: 'Fri' },
    { value: 6, label: 'Saturday', short: 'Sat' },
  ];

  const toggleDay = (day: number) => {
    const newDays = new Set(selectedDays);
    if (newDays.has(day)) {
      newDays.delete(day);
    } else {
      newDays.add(day);
    }
    setSelectedDays(newDays);
  };
  const filteredAthletes = allAthletes.filter(
    athlete =>
      athlete.name.toLowerCase().includes(athleteSearch.toLowerCase()) ||
      athlete.email.toLowerCase().includes(athleteSearch.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-[#1B1B1E] border border-[#262626] rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-white text-xl">
            {mode === 'copy' ? 'Copy' : 'Move'} Workout{selectedCount > 1 ? 's' : ''}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Select Target Athlete */}
          <div>
            <label className="block text-gray-400 mb-2">
              {mode === 'copy' ? 'Copy to Athlete' : 'Move to Athlete'}
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={athleteSearch}
                onChange={(e) => setAthleteSearch(e.target.value)}
                placeholder="Search athletes..."
                className="w-full bg-black border border-zinc-800 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:border-[#F56E0F]"
              />
            </div>
            {athleteSearch && (
              <div className="mt-2 max-h-48 overflow-y-auto bg-black border border-zinc-800 rounded-lg">
                {filteredAthletes.length > 0 ? (
                  filteredAthletes.map((athlete) => (
                    <button
                      key={athlete.id}
                      onClick={() => {
                        setTargetAthlete(athlete);
                        setAthleteSearch('');
                      }}
                      className={`w-full text-left px-4 py-2 hover:bg-zinc-800 transition-colors ${
                        targetAthlete?.id === athlete.id
                          ? 'bg-[#F56E0F]/20 border-l-2 border-[#F56E0F]'
                          : ''
                      }`}
                    >
                      <div className="text-white">{athlete.name}</div>
                      <div className="text-sm text-gray-400">{athlete.email}</div>
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-2 text-gray-400 text-sm">No athletes found</div>
                )}
              </div>
            )}
            {targetAthlete && (
              <div className="mt-2 bg-[#F56E0F]/10 border border-[#F56E0F]/30 rounded-lg p-3 flex items-center justify-between">
                <div>
                  <div className="text-white font-medium">{targetAthlete.name}</div>
                  <div className="text-sm text-gray-400">{targetAthlete.email}</div>
                </div>
                <button
                  onClick={() => setTargetAthlete(null)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Select Target Date */}
          {mode === 'copy' && (
            <div>
              <label className="flex items-center gap-2 text-gray-400 mb-2">
                <input
                  type="checkbox"
                  checked={copyToMultipleDates}
                  onChange={(e) => {
                    setCopyToMultipleDates(e.target.checked);
                    if (!e.target.checked) {
                      setSelectedDays(new Set());
                    }
                  }}
                  className="rounded border-zinc-700 bg-black text-[#F56E0F] focus:ring-[#F56E0F]"
                />
                Recurring weekly schedule
              </label>
            </div>
          )}

          {copyToMultipleDates && mode === 'copy' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-gray-400 mb-3">Select Days of Week</label>
                <div className="grid grid-cols-7 gap-2">
                  {weekDays.map((day) => (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => toggleDay(day.value)}
                      className={`py-2 px-1 rounded-lg text-sm font-medium transition-all ${
                        selectedDays.has(day.value)
                          ? 'bg-[#F56E0F] text-white border-2 border-[#F56E0F]'
                          : 'bg-black border-2 border-zinc-800 text-gray-400 hover:border-zinc-700'
                      }`}
                    >
                      <div className="text-xs opacity-70">{day.short}</div>
                    </button>
                  ))}
                </div>
                {selectedDays.size === 0 && (
                  <p className="text-xs text-gray-500 mt-2">Select at least one day</p>
                )}
              </div>
              
              <div>
                <label className="block text-gray-400 mb-2">Start Date</label>
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="w-full bg-black border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#F56E0F]"
                  style={{ colorScheme: 'dark' }}
                />
                <p className="text-xs text-gray-500 mt-1">Workouts will start from this date</p>
              </div>

              <div>
                <label className="block text-gray-400 mb-2">Number of Weeks</label>
                <input
                  type="number"
                  min="1"
                  max="52"
                  value={numberOfWeeks}
                  onChange={(e) => setNumberOfWeeks(Math.max(1, Math.min(52, parseInt(e.target.value) || 1)))}
                  className="w-full bg-black border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#F56E0F]"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {selectedDays.size > 0 && numberOfWeeks > 0 && (
                    <>Will create {selectedDays.size * numberOfWeeks} workout{selectedDays.size * numberOfWeeks !== 1 ? 's' : ''}</>
                  )}
                </p>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-gray-400 mb-2">
                {mode === 'copy' ? 'Copy to Date' : 'Move to Date'}
              </label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full bg-black border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#F56E0F]"
                style={{ colorScheme: 'dark' }}
              />
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-2 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!targetAthlete || (!copyToMultipleDates && !targetDate) || (copyToMultipleDates && (selectedDays.size === 0 || numberOfWeeks < 1))}
            className="flex-1 bg-[#F56E0F] hover:bg-[#E05D00] disabled:bg-zinc-800 disabled:text-gray-600 disabled:cursor-not-allowed text-white py-2 rounded-lg transition-colors"
          >
            {mode === 'copy' ? 'Copy' : 'Move'} {selectedCount} Workout{selectedCount !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </div>
  );
}
