import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { exercisesApi, Exercise } from '../utils/api';

interface ExerciseAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

// Create or get a dedicated portal container for dropdowns
function getPortalContainer(): HTMLElement {
  let container = document.getElementById('exercise-dropdown-portal');
  if (!container) {
    container = document.createElement('div');
    container.id = 'exercise-dropdown-portal';
    container.style.position = 'fixed';
    container.style.top = '0';
    container.style.left = '0';
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.pointerEvents = 'none';
    container.style.zIndex = '999999';
    document.body.appendChild(container);
  }
  return container;
}

export function ExerciseAutocomplete({ 
  value, 
  onChange, 
  placeholder = "Exercise name",
  className 
}: ExerciseAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const portalContainerRef = useRef<HTMLElement | null>(null);

  // Load exercises on mount
  useEffect(() => {
    loadExercises();
  }, []);

  // Get portal container
  useEffect(() => {
    if (typeof document !== 'undefined') {
      portalContainerRef.current = getPortalContainer();
    }
  }, []);

  // Update dropdown position when opening or input position changes
  useEffect(() => {
    if (open && inputRef.current) {
      const updatePosition = () => {
        const rect = inputRef.current?.getBoundingClientRect();
        if (rect) {
          setDropdownPosition({
            top: rect.bottom + 4,
            left: rect.left,
            width: rect.width,
          });
        }
      };
      
      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
      
      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [open]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open]);

  const loadExercises = async () => {
    try {
      setLoading(true);
      const data = await exercisesApi.getAll();
      setExercises(data);
    } catch (err) {
      console.error('Failed to load exercises:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter exercises based on input value and limit to 8
  const filteredExercises = exercises.length > 0 
    ? exercises.filter(exercise =>
        exercise.name.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 8)
    : [];

  const handleSelect = (exerciseName: string) => {
    onChange(exerciseName);
    setOpen(false);
    inputRef.current?.blur();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    
    // Open dropdown if there are exercises loaded and user is typing
    if (newValue.length > 0 && exercises.length > 0) {
      setOpen(true);
    } else {
      setOpen(false);
    }
  };

  const handleInputFocus = () => {
    // Open dropdown on focus if there's text and exercises are loaded
    if (value.length > 0 && exercises.length > 0) {
      setOpen(true);
    }
  };

  const dropdownContent = open && portalContainerRef.current && (
    <div
      ref={dropdownRef}
      className="bg-zinc-900 border border-zinc-800 rounded-lg shadow-lg overflow-y-auto"
      style={{ 
        position: 'fixed',
        top: `${dropdownPosition.top}px`,
        left: `${dropdownPosition.left}px`,
        width: `${dropdownPosition.width}px`,
        maxHeight: '320px', // Approximately 8 items (40px per item)
        pointerEvents: 'auto',
        scrollbarWidth: 'thin',
        scrollbarColor: '#52525b #18181b'
      }}
    >
      {loading ? (
        <div className="py-6 text-center text-sm text-gray-400">Loading exercises...</div>
      ) : filteredExercises.length === 0 ? (
        <div className="py-6 text-center text-sm text-gray-400">No exercises found.</div>
      ) : (
        filteredExercises.map((exercise) => (
          <button
            key={exercise.id}
            type="button"
            onClick={() => handleSelect(exercise.name)}
            className="w-full text-left px-4 py-2 text-white hover:bg-zinc-800 cursor-pointer transition-colors text-sm"
          >
            {exercise.name}
          </button>
        ))
      )}
    </div>
  );

  return (
    <>
      <div className="relative w-full">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          className={className}
          placeholder={placeholder}
        />
      </div>
      {portalContainerRef.current && createPortal(dropdownContent, portalContainerRef.current)}
    </>
  );
}
