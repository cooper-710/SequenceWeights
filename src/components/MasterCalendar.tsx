import { useState, useEffect } from 'react';
import { workoutsApi, athletesApi, teamsApi, type Workout, type Athlete, type Team } from '../utils/api';
import { Dumbbell } from 'lucide-react';

export function MasterCalendar() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [athletes, setAthletes] = useState<Record<string, Athlete>>({});
  const [teams, setTeams] = useState<Record<string, Team>>({});
  const [loading, setLoading] = useState(true);

  // Helper function to format date as YYYY-MM-DD in local timezone
  const formatLocalDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Helper function to parse YYYY-MM-DD string as local date
  const parseLocalDate = (dateStr: string): Date => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Fetch all workouts (no filters to get all scheduled workouts)
      const allWorkouts = await workoutsApi.getAll();
      // Filter out templates (workouts without athleteId or teamId)
      const scheduledWorkouts = allWorkouts.filter(
        (w) => w.athleteId || w.teamId
      );
      setWorkouts(scheduledWorkouts);

      // Fetch all athletes and teams for name mapping
      const [athletesList, teamsList] = await Promise.all([
        athletesApi.getAll(),
        teamsApi.getAll(),
      ]);

      const athletesMap: Record<string, Athlete> = {};
      athletesList.forEach((athlete) => {
        athletesMap[athlete.id] = athlete;
      });
      setAthletes(athletesMap);

      const teamsMap: Record<string, Team> = {};
      teamsList.forEach((team) => {
        teamsMap[team.id] = team;
      });
      setTeams(teamsMap);
    } catch (err) {
      console.error('Failed to load calendar data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Get workouts for a specific date
  const getWorkoutsForDate = (date: Date | undefined): Workout[] => {
    if (!date) return [];
    const dateStr = formatLocalDate(date);
    return workouts.filter((w) => w.date === dateStr);
  };

  // Get all workouts grouped by date
  const workoutsByDate = workouts.reduce((acc, workout) => {
    if (!acc[workout.date]) {
      acc[workout.date] = [];
    }
    acc[workout.date].push(workout);
    return acc;
  }, {} as Record<string, Workout[]>);

  // Get workout owner name
  const getWorkoutOwner = (workout: Workout): string => {
    if (workout.athleteId && athletes[workout.athleteId]) {
      return athletes[workout.athleteId].name;
    }
    if (workout.teamId && teams[workout.teamId]) {
      return teams[workout.teamId].name;
    }
    return 'Unknown';
  };

  // Helper functions for calendar
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
    return workoutsByDate[dateStr]?.length > 0;
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
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    );
  };

  const handleDateClick = (date: Date | null) => {
    if (date) {
      setSelectedDate(date);
    }
  };

  const selectedDateWorkouts = getWorkoutsForDate(selectedDate);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-400">Loading calendar...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Calendar */}
        <div className="flex-shrink-0">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-white">
                {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </h4>
              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1))}
                  className="text-gray-400 hover:text-white px-2 transition-colors"
                >
                  ‹
                </button>
                <button
                  onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1))}
                  className="text-gray-400 hover:text-white px-2 transition-colors"
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
                const today = isToday(date);
                const selected = isSelected(date);

                // Determine styling based on priority: today > selected > has workout > regular
                let className = 'aspect-square flex items-center justify-center rounded-lg text-sm transition-colors cursor-pointer';
                
                if (date) {
                  if (today) {
                    // Today always stays orange
                    className += ' bg-[#F56E0F]/30 border border-[#F56E0F] text-white font-medium hover:bg-[#F56E0F]/40';
                  } else if (selected) {
                    // Selected date (but not today) gets a different color (cyan/blue)
                    className += ' bg-cyan-500/30 border-2 border-[#ffffff] shadow-[0_0_0_1px_#ffffff] text-white font-medium hover:bg-cyan-500/40';
                  } else if (hasW) {
                    // Dates with workouts get orange border
                    className += ' bg-transparent border border-[#F56E0F] text-white hover:bg-zinc-800/50';
                  } else {
                    // Regular dates
                    className += ' text-gray-400 hover:bg-zinc-800/50';
                  }
                }

                return (
                  <div
                    key={index}
                    onClick={() => handleDateClick(date)}
                    className={className}
                    style={selected && date ? { border: '2px solid #ffffff', boxShadow: '0 0 0 1px #ffffff' } : undefined}
                  >
                    {date && (
                      <div className="relative">
                        {date.getDate()}
                        {hasW && (
                          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-orange-500 rounded-full"></div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Workout List for Selected Date */}
        <div className="flex-1">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-white mb-4">
              {selectedDate
                ? parseLocalDate(formatLocalDate(selectedDate)).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })
                : 'Select a date'}
            </h2>

            {selectedDateWorkouts.length === 0 ? (
              <div className="text-gray-400 text-center py-8">
                No workouts scheduled for this date
              </div>
            ) : (
              <div className="space-y-3">
                {selectedDateWorkouts.map((workout) => {
                  const ownerName = getWorkoutOwner(workout);
                  const exerciseCount = workout.blocks.reduce(
                    (total, block) => total + block.exercises.length,
                    0
                  );

                  return (
                    <div
                      key={workout.id}
                      className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 hover:border-zinc-600 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-orange-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                          <Dumbbell className="w-5 h-5 text-orange-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-white font-medium mb-1">{workout.name}</h3>
                          <div className="text-sm text-gray-400 space-y-1">
                            <div>
                              <span className="text-gray-500">Athlete/Team:</span>{' '}
                              <span className="text-gray-300">{ownerName}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Exercises:</span>{' '}
                              <span className="text-gray-300">{exerciseCount}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Blocks:</span>{' '}
                              <span className="text-gray-300">{workout.blocks.length}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-1">Total Scheduled Workouts</div>
          <div className="text-2xl font-semibold text-white">{workouts.length}</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-1">Unique Dates</div>
          <div className="text-2xl font-semibold text-white">
            {Object.keys(workoutsByDate).length}
          </div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-1">Athletes with Workouts</div>
          <div className="text-2xl font-semibold text-white">
            {new Set(workouts.filter((w) => w.athleteId).map((w) => w.athleteId)).size}
          </div>
        </div>
      </div>
    </div>
  );
}

