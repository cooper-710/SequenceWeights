import { useState, useEffect, useRef, useCallback } from 'react';
import { workoutsApi, Workout } from '../utils/api';

interface WorkoutTemplateAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelectTemplate?: (template: Workout) => void;
  placeholder?: string;
  className?: string;
  showAllWorkouts?: boolean; // If true, shows all workouts (templates, team workouts, etc.)
}

export function WorkoutTemplateAutocomplete({ 
  value, 
  onChange,
  onSelectTemplate,
  placeholder = "Workout name or select template",
  className,
  showAllWorkouts = false
}: WorkoutTemplateAutocompleteProps) {
  const [open, setOpen] = useState(false);
  const [templates, setTemplates] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  const loadTemplates = useCallback(async () => {
    try {
      setLoading(true);
      // If showAllWorkouts is true, load all workouts (templates, team workouts, etc.)
      // Otherwise, only load templates
      const data = showAllWorkouts 
        ? await workoutsApi.getAll() // Get all workouts
        : await workoutsApi.getAll({ templatesOnly: true }); // Only templates
      setTemplates(data);
    } catch (err) {
      console.error('Failed to load workout templates:', err);
    } finally {
      setLoading(false);
    }
  }, [showAllWorkouts]);

  // Load workout templates on mount or when showAllWorkouts changes
  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  // Filter templates based on input value
  const filteredTemplates = templates.length > 0 
    ? templates.filter(template =>
        template.name.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 10) // Limit to 10 results for performance
    : [];

  const handleSelect = (template: Workout) => {
    onChange(template.name);
    if (onSelectTemplate) {
      onSelectTemplate(template);
    }
    setOpen(false);
    inputRef.current?.blur();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    
    // Open dropdown if there are templates loaded and user is typing
    if (newValue.length > 0 && templates.length > 0) {
      setOpen(true);
    } else {
      setOpen(false);
    }
  };

  const handleInputFocus = () => {
    // Open dropdown on focus if there's text and templates are loaded
    if (value.length > 0 && templates.length > 0) {
      setOpen(true);
    }
  };

  return (
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
      {open && (
        <div
          ref={dropdownRef}
          className="absolute z-[100] w-full mt-1 bg-zinc-900 border border-zinc-800 rounded-lg shadow-lg max-h-60 overflow-auto"
        >
          {loading ? (
            <div className="py-6 text-center text-sm text-gray-400">Loading templates...</div>
          ) : filteredTemplates.length === 0 ? (
            <div className="py-6 text-center text-sm text-gray-400">No templates found.</div>
          ) : (
            filteredTemplates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => handleSelect(template)}
                className="w-full text-left px-4 py-2 text-white hover:bg-zinc-800 cursor-pointer transition-colors text-sm"
              >
                <div className="font-medium">{template.name}</div>
                <div className="text-xs text-gray-400 mt-1 flex items-center gap-2">
                  {template.blocks.length > 0 && (
                    <>
                      <span>
                        {template.blocks.length} block{template.blocks.length !== 1 ? 's' : ''} • {' '}
                        {template.blocks.reduce((total, block) => total + block.exercises.length, 0)} exercises
                      </span>
                      {showAllWorkouts && (
                        <>
                          {template.teamId && (
                            <span className="text-[#F56E0F]">• Team Workout</span>
                          )}
                          {!template.teamId && !template.athleteId && (
                            <span className="text-cyan-400">• Template</span>
                          )}
                          {template.athleteId && !template.teamId && (
                            <span className="text-gray-500">• Personal</span>
                          )}
                        </>
                      )}
                    </>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
