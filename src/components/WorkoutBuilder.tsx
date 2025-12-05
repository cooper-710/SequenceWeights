import { useState, useEffect } from 'react';
import { Plus, Trash2, ChevronDown, ChevronRight, GripVertical, Pencil } from 'lucide-react';
import { workoutsApi, Workout } from '../utils/api';
import { ExerciseAutocomplete } from './ExerciseAutocomplete';
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

interface WorkoutExercise {
  id: string;
  exerciseName: string;
  sets: number;
  reps: string;
  weight?: string;
  videoUrl?: string;
}

interface Block {
  id: string;
  name: string;
  exercises: WorkoutExercise[];
}

interface Exercise {
  id: string;
  name?: string;
  exerciseName?: string;
  sets: number;
  reps: string;
  weight?: string;
  videoUrl?: string;
}

// Sortable Exercise Component for inline display
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

  const exerciseName = exercise.name || exercise.exerciseName || '';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-black/40 border border-zinc-700 rounded-lg p-3"
    >
      <div className="flex items-center gap-2">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-300 p-1"
        >
          <GripVertical className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <div className="text-white text-sm font-medium">{exerciseName}</div>
          <div className="text-xs text-gray-400 mt-1">
            {exercise.sets} sets × {exercise.reps} reps
            {exercise.weight && ` @ ${exercise.weight}`}
          </div>
        </div>
        <button
          onClick={onEdit}
          className="text-gray-400 hover:text-blue-500 transition-colors p-1"
          title="Edit exercise"
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          onClick={onRemove}
          className="text-gray-400 hover:text-red-500 transition-colors p-1"
          title="Remove exercise"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// Sortable Block Component
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
              setIsDraggingAny(false);
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

export function WorkoutBuilder() {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [expandedWorkouts, setExpandedWorkouts] = useState<Set<string>>(new Set());
  const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(new Set());
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [editingExercise, setEditingExercise] = useState<{ workoutId: string; blockId: string; exercise: Exercise } | null>(null);
  const [activeBlockId, setActiveBlockId] = useState<string | null>(null);
  const [activeExerciseId, setActiveExerciseId] = useState<string | null>(null);
  const [isDraggingAny, setIsDraggingAny] = useState(false);

  const blockSensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Load workouts on mount
  useEffect(() => {
    loadWorkouts();
  }, []);

  const loadWorkouts = async () => {
    try {
      setLoading(true);
      setError(null);
      // Load only workout templates (reusable workouts not assigned to athletes/teams)
      const data = await workoutsApi.getAll({ templatesOnly: true });
      setWorkouts(data);
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

  const handleAddTemplate = async (templateName: string) => {
    try {
      const newWorkout = await workoutsApi.create({
        name: templateName,
        date: new Date().toISOString().split('T')[0], // Templates still need a date field for API, but we won't display it
        blocks: [],
      });
      setWorkouts([...workouts, newWorkout]);
      setShowTemplateModal(false);
    } catch (err: any) {
      console.error('Failed to create template:', err);
      alert(err.message || 'Failed to create template. Please try again.');
    }
  };

  const handleDeleteWorkout = async (workoutId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this template?')) {
      return;
    }
    try {
      await workoutsApi.delete(workoutId);
      setWorkouts(workouts.filter((w) => w.id !== workoutId));
    } catch (err: any) {
      console.error('Failed to delete template:', err);
      alert(err.message || 'Failed to delete template. Please try again.');
    }
  };

  const handleUpdateWorkoutName = async (workoutId: string, newName: string) => {
    const workout = workouts.find((w) => w.id === workoutId);
    if (!workout) return;

    try {
      const updated = await workoutsApi.update(workoutId, {
        name: newName,
        date: workout.date,
        blocks: workout.blocks,
      });
      setWorkouts(workouts.map((w) => (w.id === workoutId ? updated : w)));
    } catch (err: any) {
      console.error('Failed to update template name:', err);
      alert(err.message || 'Failed to update template name. Please try again.');
    }
  };

  const handleAddBlock = async (workoutId: string, blockName: string) => {
    const workout = workouts.find((w) => w.id === workoutId);
    if (!workout) return;

    const newBlock: Block = {
      id: Date.now().toString(),
      name: blockName,
      exercises: [],
    };

    try {
      const updated = await workoutsApi.update(workoutId, {
        name: workout.name,
        date: workout.date,
        blocks: [...workout.blocks, newBlock],
      });
      setWorkouts(workouts.map((w) => (w.id === workoutId ? updated : w)));
      setExpandedBlocks(new Set([...expandedBlocks, newBlock.id]));
      setShowBlockModal(false);
    } catch (err: any) {
      console.error('Failed to add block:', err);
      alert(err.message || 'Failed to add block. Please try again.');
    }
  };

  const handleRemoveBlock = async (workoutId: string, blockId: string) => {
    const workout = workouts.find((w) => w.id === workoutId);
    if (!workout) return;

    try {
      const updated = await workoutsApi.update(workoutId, {
        name: workout.name,
        date: workout.date,
        blocks: workout.blocks.filter((b) => b.id !== blockId),
      });
      setWorkouts(workouts.map((w) => (w.id === workoutId ? updated : w)));
    } catch (err: any) {
      console.error('Failed to remove block:', err);
      alert(err.message || 'Failed to remove block. Please try again.');
    }
  };

  const handleAddExercise = async (exercise: Exercise) => {
    if (!selectedWorkoutId || !selectedBlockId) return;

    const workout = workouts.find((w) => w.id === selectedWorkoutId);
    if (!workout) return;

    const block = workout.blocks.find((b) => b.id === selectedBlockId);
    if (!block) return;

    const newExercise: WorkoutExercise = {
      id: exercise.id,
      exerciseName: exercise.name || exercise.exerciseName || '',
      sets: exercise.sets,
      reps: exercise.reps,
      weight: exercise.weight,
      videoUrl: exercise.videoUrl,
    };

    try {
      const updated = await workoutsApi.update(selectedWorkoutId, {
        name: workout.name,
        date: workout.date,
        blocks: workout.blocks.map((b) =>
          b.id === selectedBlockId
            ? { ...b, exercises: [...b.exercises, newExercise] }
            : b
        ),
      });
      setWorkouts(workouts.map((w) => (w.id === selectedWorkoutId ? updated : w)));
      setShowExerciseModal(false);
      setSelectedWorkoutId(null);
      setSelectedBlockId(null);
    } catch (err: any) {
      console.error('Failed to add exercise:', err);
      alert(err.message || 'Failed to add exercise. Please try again.');
    }
  };

  const handleEditExercise = async (workoutId: string, blockId: string, updatedExercise: Exercise) => {
    const workout = workouts.find((w) => w.id === workoutId);
    if (!workout) return;

    const exerciseData: WorkoutExercise = {
      id: updatedExercise.id,
      exerciseName: updatedExercise.name || updatedExercise.exerciseName || '',
      sets: updatedExercise.sets,
      reps: updatedExercise.reps,
      weight: updatedExercise.weight,
      videoUrl: updatedExercise.videoUrl,
    };

    try {
      const updated = await workoutsApi.update(workoutId, {
        name: workout.name,
        date: workout.date,
        blocks: workout.blocks.map((b) =>
          b.id === blockId
            ? {
                ...b,
                exercises: b.exercises.map((e) =>
                  e.id === exerciseData.id ? exerciseData : e
                ),
              }
            : b
        ),
      });
      setWorkouts(workouts.map((w) => (w.id === workoutId ? updated : w)));
      setShowExerciseModal(false);
      setEditingExercise(null);
    } catch (err: any) {
      console.error('Failed to update exercise:', err);
      alert(err.message || 'Failed to update exercise. Please try again.');
    }
  };

  const handleRemoveExercise = async (workoutId: string, blockId: string, exerciseId: string) => {
    const workout = workouts.find((w) => w.id === workoutId);
    if (!workout) return;

    try {
      const updated = await workoutsApi.update(workoutId, {
        name: workout.name,
        date: workout.date,
        blocks: workout.blocks.map((b) =>
          b.id === blockId
            ? { ...b, exercises: b.exercises.filter((e) => e.id !== exerciseId) }
            : b
        ),
      });
      setWorkouts(workouts.map((w) => (w.id === workoutId ? updated : w)));
    } catch (err: any) {
      console.error('Failed to remove exercise:', err);
      alert(err.message || 'Failed to remove exercise. Please try again.');
    }
  };

  const getTotalExerciseCount = (workout: Workout) => {
    return workout.blocks.reduce((total, block) => total + block.exercises.length, 0);
  };

  const handleBlockDragEnd = async (event: DragEndEvent, workoutId: string) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) {
      setActiveBlockId(null);
      setIsDraggingAny(false);
      return;
    }

    const workout = workouts.find((w) => w.id === workoutId);
    if (!workout) return;

    const oldIndex = workout.blocks.findIndex((b) => b.id === active.id);
    const newIndex = workout.blocks.findIndex((b) => b.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      try {
        const updated = await workoutsApi.update(workoutId, {
          name: workout.name,
          date: workout.date,
          blocks: arrayMove(workout.blocks, oldIndex, newIndex),
        });
        setWorkouts(workouts.map((w) => (w.id === workoutId ? updated : w)));
      } catch (err: any) {
        console.error('Failed to reorder blocks:', err);
        alert(err.message || 'Failed to reorder blocks. Please try again.');
      }
    }
    
    setActiveBlockId(null);
    setIsDraggingAny(false);
  };

  const handleExerciseDragEnd = async (event: DragEndEvent, blockId: string, workoutId: string) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) {
      return;
    }

    const workout = workouts.find((w) => w.id === workoutId);
    if (!workout) return;

    const block = workout.blocks.find((b) => b.id === blockId);
    if (!block) return;

    const oldIndex = block.exercises.findIndex((e) => e.id === active.id);
    const newIndex = block.exercises.findIndex((e) => e.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      try {
        const updated = await workoutsApi.update(workoutId, {
          name: workout.name,
          date: workout.date,
          blocks: workout.blocks.map((b) =>
            b.id === blockId
              ? { ...b, exercises: arrayMove(b.exercises, oldIndex, newIndex) }
              : b
          ),
        });
        setWorkouts(workouts.map((w) => (w.id === workoutId ? updated : w)));
      } catch (err: any) {
        console.error('Failed to reorder exercises:', err);
        alert(err.message || 'Failed to reorder exercises. Please try again.');
      }
    }
  };

  const handleBlockDragStart = (event: DragStartEvent) => {
    setActiveBlockId(event.active.id as string);
    setIsDraggingAny(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-white">Loading templates...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500 rounded-lg p-6">
        <p className="text-red-400 mb-4">{error}</p>
        <button
          onClick={loadWorkouts}
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-white text-2xl">Workout Templates</h2>
        <button
          onClick={() => setShowTemplateModal(true)}
          className="flex items-center gap-2 bg-[#F56E0F] hover:bg-[#E05D00] text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Template
        </button>
      </div>

      {/* Templates List */}
      {workouts.length === 0 ? (
        <div className="bg-[#1B1B1E] border border-[#262626] rounded-lg p-8 text-center">
          <p className="text-gray-400 mb-4">No templates yet</p>
          <button
            onClick={() => setShowTemplateModal(true)}
            className="inline-flex items-center justify-center gap-2 bg-[#F56E0F] hover:bg-[#E05D00] text-white px-6 py-3 rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            Create your first template
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {workouts.map((workout) => (
            <div
              key={workout.id}
              className="bg-[#1B1B1E] border border-[#262626] rounded-lg overflow-hidden"
            >
              {/* Workout Header */}
              <div className="p-4 flex items-center justify-between gap-3">
                <button
                  onClick={() => toggleWorkout(workout.id)}
                  className="flex items-center gap-3 flex-1 text-left"
                >
                  {expandedWorkouts.has(workout.id) ? (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  )}
                  <div className="flex-1">
                    <input
                      type="text"
                      value={workout.name}
                      onChange={(e) => handleUpdateWorkoutName(workout.id, e.target.value)}
                      onBlur={(e) => handleUpdateWorkoutName(workout.id, e.target.value)}
                      className="bg-transparent border-none text-white text-lg font-medium focus:outline-none focus:ring-1 focus:ring-[#F56E0F] rounded px-1"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <p className="text-sm text-gray-400">
                      {workout.blocks.length} block{workout.blocks.length !== 1 ? 's' : ''} • {getTotalExerciseCount(workout)} exercise{getTotalExerciseCount(workout) !== 1 ? 's' : ''}
                    </p>
                  </div>
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteWorkout(workout.id, e);
                  }}
                  className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
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
                            exercises={block.exercises.map((e) => ({
                              id: e.id,
                              name: e.exerciseName,
                              exerciseName: e.exerciseName,
                              sets: e.sets,
                              reps: e.reps,
                              weight: e.weight,
                              videoUrl: e.videoUrl,
                            }))}
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
          ))}
        </div>
      )}

      {/* Add Template Modal */}
      {showTemplateModal && (
        <AddTemplateModal
          onAdd={handleAddTemplate}
          onClose={() => setShowTemplateModal(false)}
        />
      )}

      {/* Add Block Modal */}
      {showBlockModal && selectedWorkoutId && (
        <AddBlockModal
          onAdd={(blockName) => handleAddBlock(selectedWorkoutId, blockName)}
          onClose={() => {
            setShowBlockModal(false);
            setSelectedWorkoutId(null);
          }}
        />
      )}

      {/* Add/Edit Exercise Modal */}
      {showExerciseModal && (
        <AddExerciseModal
          onAdd={handleAddExercise}
          onEdit={handleEditExercise}
          editingExercise={editingExercise}
          onClose={() => {
            setShowExerciseModal(false);
            setEditingExercise(null);
            setSelectedWorkoutId(null);
            setSelectedBlockId(null);
          }}
        />
      )}
    </div>
  );
}

interface AddTemplateModalProps {
  onAdd: (templateName: string) => void;
  onClose: () => void;
}

function AddTemplateModal({ onAdd, onClose }: AddTemplateModalProps) {
  const [templateName, setTemplateName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (templateName.trim()) {
      onAdd(templateName.trim());
      setTemplateName('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-[#1B1B1E] border border-[#262626] rounded-lg p-6 w-full max-w-md">
        <h3 className="text-white text-xl mb-4">Add Template</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-400 mb-2">Template Name</label>
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="w-full bg-black border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#F56E0F]"
              placeholder="e.g., Upper Body Strength"
              required
              autoFocus
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
              Add Template
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
    if (blockName.trim()) {
      onAdd(blockName.trim());
      setBlockName('');
    }
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
