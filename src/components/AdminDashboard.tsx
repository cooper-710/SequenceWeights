import { useState } from 'react';
import { Users, Dumbbell, Calendar, Plus, UsersRound, CalendarDays } from 'lucide-react';
import { AthleteManager } from './AthleteManager';
import { ExerciseLibrary } from './ExerciseLibrary';
import { WorkoutBuilder } from './WorkoutBuilder';
import { PlayerWorkoutEditor } from './PlayerWorkoutEditor';
import { TeamManager } from './TeamManager';
import { MasterCalendar } from './MasterCalendar';
import sequenceLogo from 'figma:asset/5c2d0c8af8dfc8338b2c35795df688d7811f7b51.png';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface AdminDashboardProps {
  user: { id: string; name: string; role: 'admin' | 'user' };
  onLogout: () => void;
}

interface Athlete {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export function AdminDashboard({ user, onLogout }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'athletes' | 'teams' | 'exercises' | 'workouts' | 'calendar'>('athletes');
  const [selectedAthlete, setSelectedAthlete] = useState<Athlete | null>(null);

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="bg-[#1B1B1E] border-b border-[#262626]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 overflow-visible">
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 min-w-0">
              <div className="flex-shrink-0">
                <ImageWithFallback
                  src={sequenceLogo}
                  alt="Sequence"
                  className="h-8 sm:h-10 w-auto object-contain mix-blend-screen"
                  fallback={<img src={sequenceLogo} alt="Sequence" className="h-8 sm:h-10 w-auto object-contain mix-blend-screen" />}
                />
              </div>
              <div className="min-w-0">
                <h1 className="text-white text-sm sm:text-base whitespace-nowrap">SEQUENCE</h1>
                <p className="text-xs text-gray-400 whitespace-nowrap">Admin Dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-gray-400 text-sm">{user.name}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-zinc-900/50 border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-8 overflow-x-auto">
            <button
              onClick={() => setActiveTab('athletes')}
              className={`flex items-center gap-2 py-4 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'athletes'
                  ? 'border-orange-500 text-white'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              <Users className="w-5 h-5" />
              Athletes
            </button>
            <button
              onClick={() => setActiveTab('teams')}
              className={`flex items-center gap-2 py-4 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'teams'
                  ? 'border-orange-500 text-white'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              <UsersRound className="w-5 h-5" />
              Teams
            </button>
            <button
              onClick={() => setActiveTab('exercises')}
              className={`flex items-center gap-2 py-4 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'exercises'
                  ? 'border-orange-500 text-white'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              <Dumbbell className="w-5 h-5" />
              Exercise Library
            </button>
            <button
              onClick={() => setActiveTab('workouts')}
              className={`flex items-center gap-2 py-4 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'workouts'
                  ? 'border-orange-500 text-white'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              <Calendar className="w-5 h-5" />
              Workouts
            </button>
            <button
              onClick={() => setActiveTab('calendar')}
              className={`flex items-center gap-2 py-4 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'calendar'
                  ? 'border-orange-500 text-white'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              <CalendarDays className="w-5 h-5" />
              Calendar
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'athletes' && !selectedAthlete && (
          <AthleteManager onSelectAthlete={setSelectedAthlete} />
        )}
        {activeTab === 'athletes' && selectedAthlete && (
          <PlayerWorkoutEditor
            athlete={selectedAthlete}
            onBack={() => setSelectedAthlete(null)}
          />
        )}
        {activeTab === 'teams' && <TeamManager />}
        {activeTab === 'exercises' && <ExerciseLibrary />}
        {activeTab === 'workouts' && <WorkoutBuilder />}
        {activeTab === 'calendar' && <MasterCalendar />}
      </div>
    </div>
  );
}