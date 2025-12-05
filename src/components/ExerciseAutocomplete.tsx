import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { exercisesApi, Exercise } from '../utils/api';

interface ExerciseAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
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

  // Load exercises on mount
  useEffect(() => {
    loadExercises();
  }, []);

  // Update dropdown position when opening or input position changes
  useEffect(() => {
    if (open && inputRef.current) {
      const updatePosition = () => {
        const rect = inputRef.current?.getBoundingClientRect();
        if (rect) {
          setDropdownPosition({
            top: rect.bottom + window.scrollY + 4,
            left: rect.left + window.scrollX,
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

  // Filter exercises based on input value
  const filteredExercises = exercises.length > 0 
    ? exercises.filter(exercise =>
        exercise.name.toLowerCase().includes(value.toLowerCase())
      )
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

  const dropdownContent = open && (
    <div
      ref={dropdownRef}
      className="fixed z-[9999] bg-zinc-900 border border-zinc-800 rounded-lg shadow-lg max-h-60 overflow-y-auto overscroll-contain"
      style={{ 
        top: `${dropdownPosition.top}px`,
        left: `${dropdownPosition.left}px`,
        width: `${dropdownPosition.width}px`,
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
      {typeof document !== 'undefined' && createPortal(dropdownContent, document.body)}
    </>
  );
}