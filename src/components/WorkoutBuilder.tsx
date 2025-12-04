import { useState, useEffect } from 'react';
import { Plus, Calendar, Trash2, ChevronDown, ChevronRight, Pencil, GripVertical } from 'lucide-react';
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

// Sortable Exercise Component
function SortableExercise({
  exercise,
  blockId,
  updateExercise,
  handleRemoveExercise,
  isDraggingAny,
}: {
  exercise: WorkoutExercise;
  blockId: string;
  updateExercise: (blockId: string, exerciseId: string, field: keyof WorkoutExercise, value: any) => void;
  handleRemoveExercise: (blockId: string, exerciseId: string) => void;
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
      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-300 p-1 mt-1"
        >
          <GripVertical className="w-4 h-4" />
        </button>
        <div className="flex-1 space-y-2">
          <ExerciseAutocomplete
            value={exercise.exerciseName}
            onChange={(value) => updateExercise(blockId, exercise.id, 'exerciseName', value)}
            placeholder="Exercise name"
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#F56E0F]"
          />
          <div className="grid grid-cols-3 gap-2">
            <input
              type="number"
              value={exercise.sets}
              onChange={(e) => updateExercise(blockId, exercise.id, 'sets', parseInt(e.target.value))}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#F56E0F]"
              placeholder="Sets"
            />
            <input
              type="text"
              value={exercise.reps}
              onChange={(e) => updateExercise(blockId, exercise.id, 'reps', e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#F56E0F]"
              placeholder="Reps"
            />
            <input
              type="text"
              value={exercise.weight || ''}
              onChange={(e) => updateExercise(blockId, exercise.id, 'weight', e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#F56E0F]"
              placeholder="Weight"
            />
          </div>
        </div>
        <button
          onClick={() => handleRemoveExercise(blockId, exercise.id)}
          className="text-gray-400 hover:text-red-500 transition-colors mt-1"
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
  isExpanded,
  onToggle,
  onRemove,
  updateExercise,
  handleRemoveExercise,
  handleAddExerciseToBlock,
  onExerciseDragEnd,
  activeExerciseId,
  setActiveExerciseId,
  isDraggingAny,
  setIsDraggingAny,
}: {
  block: Block;
  isExpanded: boolean;
  onToggle: () => void;
  onRemove: () => void;
  updateExercise: (blockId: string, exerciseId: string, field: keyof WorkoutExercise, value: any) => void;
  handleRemoveExercise: (blockId: string, exerciseId: string) => void;
  handleAddExerciseToBlock: (blockId: string) => void;
  onExerciseDragEnd: (event: DragEndEvent, blockId: string) => void;
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
      <div className="p-3 flex items-center justify-between bg-black/20">
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
              onExerciseDragEnd(e, block.id);
              setActiveExerciseId(null);
              setIsDraggingAny(false);
            }}
          >
            <SortableContext
              items={block.exercises.map((e) => e.id)}
              strategy={verticalListSortingStrategy}
            >
              {block.exercises.map((exercise) => (
                <SortableExercise
                  key={exercise.id}
                  exercise={exercise}
                  blockId={block.id}
                  updateExercise={updateExercise}
                  handleRemoveExercise={handleRemoveExercise}
                  isDraggingAny={isDraggingAny}
                />
              ))}
            </SortableContext>
            <DragOverlay>
              {activeExerciseId ? (
                <div className="bg-black/40 border border-zinc-700 rounded-lg p-3 opacity-90">
                  <div className="text-white text-sm">
                    {block.exercises.find((e) => e.id === activeExerciseId)?.exerciseName || 'Exercise'}
                  </div>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>

          {/* Add Exercise to Block Button */}
          <button
            onClick={() => handleAddExerciseToBlock(block.id)}
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
  const [showModal, setShowModal] = useState(false);
  const [editingWorkout, setEditingWorkout] = useState<Workout | null>(null);
  const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(new Set());
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
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

  const toggleBlock = (blockId: string) => {
    const newExpanded = new Set(expandedBlocks);
    if (newExpanded.has(blockId)) {
      newExpanded.delete(blockId);
    } else {
      newExpanded.add(blockId);
    }
    setExpandedBlocks(newExpanded);
  };

  const handleSaveWorkout = async () => {
    if (!editingWorkout) return;
    
    try {
      if (editingWorkout.id === 'new') {
        // Create new workout template (no athleteId or teamId)
        const newWorkout = await workoutsApi.create({
          name: editingWorkout.name,
          date: editingWorkout.date,
          // No athleteId or teamId - this is a template
          blocks: editingWorkout.blocks,
        });
        setWorkouts([...workouts, newWorkout]);
      } else {
        // Update existing workout
        const updated = await workoutsApi.update(editingWorkout.id, {
          name: editingWorkout.name,
          date: editingWorkout.date,
          athleteId: editingWorkout.athleteId,
          blocks: editingWorkout.blocks,
        });
        setWorkouts(workouts.map((w) => (w.id === editingWorkout.id ? updated : w)));
      }
      setEditingWorkout(null);
      setShowModal(false);
      setExpandedBlocks(new Set());
    } catch (err: any) {
      console.error('Failed to save workout:', err);
      alert(err.message || 'Failed to save workout. Please try again.');
    }
  };

  const handleDeleteWorkout = async (workoutId: string, e: React.MouseEvent) => {
    e.stopPropagation();
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

  const handleAddBlock = (blockName: string) => {
    if (editingWorkout) {
      const newBlock: Block = {
        id: Date.now().toString(),
        name: blockName,
        exercises: [],
      };
      setEditingWorkout({
        ...editingWorkout,
        blocks: [...editingWorkout.blocks, newBlock],
      });
      setExpandedBlocks(new Set([...expandedBlocks, newBlock.id]));
      setShowBlockModal(false);
    }
  };

  const handleRemoveBlock = (blockId: string) => {
    if (editingWorkout) {
      setEditingWorkout({
        ...editingWorkout,
        blocks: editingWorkout.blocks.filter((b) => b.id !== blockId),
      });
    }
  };

  const handleAddExerciseToBlock = (blockId: string) => {
    if (editingWorkout) {
      const newExercise: WorkoutExercise = {
        id: Date.now().toString(),
        exerciseName: '',
        sets: 3,
        reps: '10',
      };
      setEditingWorkout({
        ...editingWorkout,
        blocks: editingWorkout.blocks.map((block) =>
          block.id === blockId
            ? { ...block, exercises: [...block.exercises, newExercise] }
            : block
        ),
      });
    }
  };

  const handleRemoveExercise = (blockId: string, exerciseId: string) => {
    if (editingWorkout) {
      setEditingWorkout({
        ...editingWorkout,
        blocks: editingWorkout.blocks.map((block) =>
          block.id === blockId
            ? { ...block, exercises: block.exercises.filter((e) => e.id !== exerciseId) }
            : block
        ),
      });
    }
  };

  const updateExercise = (blockId: string, exerciseId: string, field: keyof WorkoutExercise, value: any) => {
    if (editingWorkout) {
      setEditingWorkout({
        ...editingWorkout,
        blocks: editingWorkout.blocks.map((block) =>
          block.id === blockId
            ? {
                ...block,
                exercises: block.exercises.map((e) =>
                  e.id === exerciseId ? { ...e, [field]: value } : e
                ),
              }
            : block
        ),
      });
    }
  };

  const startNewWorkout = () => {
    setEditingWorkout({
      id: 'new',
      name: '',
      date: new Date().toISOString().split('T')[0],
      athleteId: '',
      blocks: [],
    });
    setShowModal(true);
    setExpandedBlocks(new Set());
  };

  const getTotalExerciseCount = (workout: Workout) => {
    return workout.blocks.reduce((total, block) => total + block.exercises.length, 0);
  };

  const getAllExercises = (workout: Workout) => {
    return workout.blocks.flatMap((block) => block.exercises);
  };

  const handleBlockDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!editingWorkout || !over || active.id === over.id) {
      setActiveBlockId(null);
      setIsDraggingAny(false);
      return;
    }

    const oldIndex = editingWorkout.blocks.findIndex((b) => b.id === active.id);
    const newIndex = editingWorkout.blocks.findIndex((b) => b.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      setEditingWorkout({
        ...editingWorkout,
        blocks: arrayMove(editingWorkout.blocks, oldIndex, newIndex),
      });
    }
    
    setActiveBlockId(null);
    setIsDraggingAny(false);
  };

  const handleExerciseDragEnd = (event: DragEndEvent, blockId: string) => {
    const { active, over } = event;
    
    if (!editingWorkout || !over || active.id === over.id) {
      return;
    }

    const block = editingWorkout.blocks.find((b) => b.id === blockId);
    if (!block) {
      return;
    }

    const oldIndex = block.exercises.findIndex((e) => e.id === active.id);
    const newIndex = block.exercises.findIndex((e) => e.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      setEditingWorkout({
        ...editingWorkout,
        blocks: editingWorkout.blocks.map((b) =>
          b.id === blockId
            ? { ...b, exercises: arrayMove(b.exercises, oldIndex, newIndex) }
            : b
        ),
      });
    }
  };

  const handleBlockDragStart = (event: DragStartEvent) => {
    setActiveBlockId(event.active.id as string);
    setIsDraggingAny(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-white">Loading workouts...</div>
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
          onClick={startNewWorkout}
          className="flex items-center gap-2 bg-[#F56E0F] hover:bg-[#E05D00] text-white px-4 py-2 rounded-lg transition-colors"
        >
          + Template
        </button>
      </div>

      {/* Workouts List */}
      <div className="grid gap-4">
        {workouts.map((workout) => (
          <div
            key={workout.id}
            className="bg-[#1B1B1E] border border-[#262626] rounded-xl p-6 hover:border-[#F56E0F]/50 transition-all cursor-pointer group"
            onClick={() => {
              setEditingWorkout(workout);
              setShowModal(true);
              // Expand all blocks when editing
              const allBlockIds = workout.blocks.map((b) => b.id);
              setExpandedBlocks(new Set(allBlockIds));
            }}
          >
            {/* Header Section */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-[#F56E0F]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-6 h-6 text-[#F56E0F]" />
                </div>
                <div>
                  <h3 className="text-white text-xl mb-1">{workout.name}</h3>
                  <p className="text-sm text-gray-400">{new Date(workout.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</p>
                </div>
              </div>
              <button
                onClick={(e) => handleDeleteWorkout(workout.id, e)}
                className="text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 p-2 rounded-lg hover:bg-red-500/10"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>

            {/* Stats Section */}
            <div className="flex items-center gap-4 mb-4 pb-4 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-cyan-400"></div>
                <span className="text-sm text-gray-300">
                  <span className="text-white">{workout.blocks.length}</span> {workout.blocks.length !== 1 ? 'Blocks' : 'Block'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                <span className="text-sm text-gray-300">
                  <span className="text-white">{getTotalExerciseCount(workout)}</span> {getTotalExerciseCount(workout) !== 1 ? 'Exercises' : 'Exercise'}
                </span>
              </div>
            </div>

            {/* Exercise Preview */}
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Preview</p>
              <div className="flex flex-wrap gap-2">
                {getAllExercises(workout).slice(0, 3).map((ex) => (
                  <span key={ex.id} className="text-xs bg-zinc-800/80 text-gray-300 px-3 py-1.5 rounded-lg border border-zinc-700">
                    {ex.exerciseName}
                  </span>
                ))}
                {getTotalExerciseCount(workout) > 3 && (
                  <span className="text-xs text-gray-500 px-3 py-1.5">+{getTotalExerciseCount(workout) - 3} more exercises</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Workout Editor Modal */}
      {showModal && editingWorkout && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-[#1B1B1E] border border-[#262626] rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-[#262626]">
              <h3 className="text-white text-xl">
                {editingWorkout.id === 'new' ? 'Create Workout' : 'Edit Workout'}
              </h3>
            </div>

            <div className="p-6 space-y-6">
              {/* Workout Details */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 mb-2">Workout Name</label>
                  <input
                    type="text"
                    value={editingWorkout.name}
                    onChange={(e) => setEditingWorkout({ ...editingWorkout, name: e.target.value })}
                    className="w-full bg-black border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#F56E0F]"
                    placeholder="e.g., Lower Body Strength"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 mb-2">Date</label>
                  <input
                    type="date"
                    value={editingWorkout.date}
                    onChange={(e) => setEditingWorkout({ ...editingWorkout, date: e.target.value })}
                    className="w-full bg-black border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-[#F56E0F]"
                    style={{ colorScheme: 'dark' }}
                  />
                </div>
              </div>

              {/* Blocks */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <label className="text-gray-400">Workout Structure</label>
                </div>

                <DndContext
                  sensors={blockSensors}
                  collisionDetection={closestCenter}
                  onDragStart={handleBlockDragStart}
                  onDragEnd={handleBlockDragEnd}
                >
                  <SortableContext
                    items={editingWorkout.blocks.map((b) => b.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-3">
                      {editingWorkout.blocks.map((block) => (
                        <SortableBlock
                          key={block.id}
                          block={block}
                          isExpanded={expandedBlocks.has(block.id)}
                          onToggle={() => toggleBlock(block.id)}
                          onRemove={() => handleRemoveBlock(block.id)}
                          updateExercise={updateExercise}
                          handleRemoveExercise={handleRemoveExercise}
                          handleAddExerciseToBlock={handleAddExerciseToBlock}
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
                          {editingWorkout.blocks.find((b) => b.id === activeBlockId)?.name || 'Block'}
                        </div>
                      </div>
                    ) : null}
                  </DragOverlay>
                </DndContext>

                {/* Add Block Button */}
                <button
                  onClick={() => setShowBlockModal(true)}
                  className="w-full mt-3 bg-zinc-900 border border-zinc-800 hover:border-[#F56E0F] rounded-lg p-3 flex items-center justify-center gap-2 text-gray-400 hover:text-white transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Block
                </button>
              </div>
            </div>

            <div className="p-6 border-t border-[#262626] flex gap-3">
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingWorkout(null);
                  setExpandedBlocks(new Set());
                }}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveWorkout}
                className="flex-1 bg-[#F56E0F] hover:bg-[#E05D00] text-white py-2 rounded-lg transition-colors"
              >
                Save Workout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Block Modal */}
      {showBlockModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[60]">
          <div className="bg-[#1B1B1E] border border-[#262626] rounded-lg p-6 w-full max-w-md">
            <h3 className="text-white text-xl mb-4">Add Block</h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const blockName = formData.get('blockName') as string;
                handleAddBlock(blockName);
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-gray-400 mb-2">Block Name</label>
                <input
                  type="text"
                  name="blockName"
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
                  onClick={() => setShowBlockModal(false)}
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
      )}
    </div>
  );
}