import { useState, useEffect } from 'react';
import { Plus, Users, Calendar, Trash2, ChevronRight, UserPlus, Search, X, Dumbbell } from 'lucide-react';
import { teamsApi, athletesApi, workoutsApi, Team, Athlete, Workout } from '../utils/api';
import { ExerciseAutocomplete } from './ExerciseAutocomplete';
import { WorkoutTemplateAutocomplete } from './WorkoutTemplateAutocomplete';

interface Athlete {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

interface TeamWorkout {
  id: string;
  name: string;
  date: string;
  blocks: Block[];
}

interface Block {
  id: string;
  name: string;
  exercises: WorkoutExercise[];
}

interface WorkoutExercise {
  id: string;
  exerciseName: string;
  sets: number;
  reps: string;
  weight?: string;
}

interface Team {
  id: string;
  name: string;
  description: string;
  athletes: Athlete[];
  workouts: TeamWorkout[];
  createdAt: string;
}

export function TeamManager() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [availableAthletes, setAvailableAthletes] = useState<Athlete[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showTeamModal, setShowTeamModal] = useState(false);
  const [showAthleteModal, setShowAthleteModal] = useState(false);
  const [showWorkoutModal, setShowWorkoutModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [newTeam, setNewTeam] = useState({ name: '', description: '' });
  const [athleteSearch, setAthleteSearch] = useState('');
  const [expandedTeams, setExpandedTeams] = useState<Set<string>>(new Set());

  // Load teams and athletes on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [teamsData, athletesData] = await Promise.all([
        teamsApi.getAll(),
        athletesApi.getAll(),
      ]);
      setTeams(teamsData);
      setAvailableAthletes(athletesData);
    } catch (err) {
      console.error('Failed to load data:', err);
      setError('Failed to load teams and athletes. Make sure the backend server is running.');
    } finally {
      setLoading(false);
    }
  };
  
  // Workout builder state
  const [editingWorkout, setEditingWorkout] = useState<TeamWorkout | null>(null);
  const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(new Set());
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [newBlockName, setNewBlockName] = useState('');

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const team = await teamsApi.create({
        name: newTeam.name,
        description: newTeam.description,
      });
      setTeams([...teams, team]);
      setNewTeam({ name: '', description: '' });
      setShowTeamModal(false);
    } catch (err: any) {
      console.error('Failed to create team:', err);
      alert(err.message || 'Failed to create team. Please try again.');
    }
  };

  const handleAddAthleteToTeam = async (teamId: string, athlete: Athlete) => {
    try {
      await teamsApi.addAthlete(teamId, athlete.id);
      // Reload teams to get updated data
      const updatedTeams = await teamsApi.getAll();
      setTeams(updatedTeams);
    } catch (err: any) {
      console.error('Failed to add athlete to team:', err);
      alert(err.message || 'Failed to add athlete to team. Please try again.');
    }
  };

  const handleRemoveAthleteFromTeam = async (teamId: string, athleteId: string) => {
    try {
      await teamsApi.removeAthlete(teamId, athleteId);
      // Reload teams to get updated data
      const updatedTeams = await teamsApi.getAll();
      setTeams(updatedTeams);
    } catch (err: any) {
      console.error('Failed to remove athlete from team:', err);
      alert(err.message || 'Failed to remove athlete from team. Please try again.');
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    if (!confirm('Are you sure you want to delete this team?')) {
      return;
    }
    try {
      await teamsApi.delete(teamId);
      setTeams(teams.filter(t => t.id !== teamId));
    } catch (err: any) {
      console.error('Failed to delete team:', err);
      alert(err.message || 'Failed to delete team. Please try again.');
    }
  };

  const toggleTeam = (teamId: string) => {
    const newExpanded = new Set(expandedTeams);
    if (newExpanded.has(teamId)) {
      newExpanded.delete(teamId);
    } else {
      newExpanded.add(teamId);
    }
    setExpandedTeams(newExpanded);
  };

  const filteredAthletes = selectedTeam
    ? availableAthletes.filter(
        athlete =>
          !selectedTeam.athletes.some(a => a.id === athlete.id) &&
          athlete.name.toLowerCase().includes(athleteSearch.toLowerCase())
      )
    : [];

  // Workout builder functions
  const startNewWorkout = () => {
    setEditingWorkout({
      id: 'new',
      name: '',
      date: new Date().toISOString().split('T')[0],
      blocks: [],
    });
    setExpandedBlocks(new Set());
  };

  const handleSaveWorkout = async () => {
    if (editingWorkout && selectedTeam && editingWorkout.name && editingWorkout.blocks.length > 0) {
      try {
        await workoutsApi.create({
          name: editingWorkout.name,
          date: editingWorkout.date,
          teamId: selectedTeam.id,
          blocks: editingWorkout.blocks,
        });
        
        // Reload teams to get updated workouts
        const updatedTeams = await teamsApi.getAll();
        setTeams(updatedTeams);
        
        setEditingWorkout(null);
        setShowWorkoutModal(false);
        setSelectedTeam(null);
        setExpandedBlocks(new Set());
      } catch (err: any) {
        console.error('Failed to save workout:', err);
        alert(err.message || 'Failed to save workout. Please try again.');
      }
    }
  };

  const handleAddBlock = () => {
    if (editingWorkout && newBlockName.trim()) {
      const newBlock: Block = {
        id: Date.now().toString(),
        name: newBlockName,
        exercises: [],
      };
      setEditingWorkout({
        ...editingWorkout,
        blocks: [...editingWorkout.blocks, newBlock],
      });
      setExpandedBlocks(new Set([...expandedBlocks, newBlock.id]));
      setShowBlockModal(false);
      setNewBlockName('');
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

  const toggleBlock = (blockId: string) => {
    const newExpanded = new Set(expandedBlocks);
    if (newExpanded.has(blockId)) {
      newExpanded.delete(blockId);
    } else {
      newExpanded.add(blockId);
    }
    setExpandedBlocks(newExpanded);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-white">Loading teams...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500 rounded-lg p-6">
        <p className="text-red-400 mb-4">{error}</p>
        <button
          onClick={loadData}
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-white text-3xl mb-2">Team Management</h2>
          <p className="text-gray-400">Create teams and assign workouts to multiple athletes</p>
        </div>
        <button
          onClick={() => setShowTeamModal(true)}
          className="flex items-center gap-2 bg-[#F56E0F] hover:bg-[#E05D00] text-white px-6 py-3 rounded-xl transition-all shadow-lg shadow-[#F56E0F]/20"
        >
          <Plus className="w-5 h-5" />
          Team
        </button>
      </div>

      {/* Teams Grid */}
      <div className="space-y-4">
        {teams.map((team) => (
          <div
            key={team.id}
            className="bg-[#1B1B1E] border border-zinc-800 rounded-2xl overflow-hidden transition-all hover:border-[#F56E0F]/30"
          >
            {/* Team Header */}
            <div className="p-6 border-b border-zinc-800/50">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <button
                    onClick={() => toggleTeam(team.id)}
                    className="text-gray-400 hover:text-[#F56E0F] transition-colors flex-shrink-0"
                  >
                    <ChevronRight
                      className={`w-5 h-5 transition-transform ${
                        expandedTeams.has(team.id) ? 'rotate-90' : ''
                      }`}
                    />
                  </button>
                  <div className="w-12 h-12 bg-gradient-to-br from-[#F56E0F] to-orange-600 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white text-xl mb-1 truncate">{team.name}</h3>
                    <div className="flex items-center flex-wrap gap-x-4 gap-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-400"></div>
                        <span className="text-xs text-gray-400">
                          <span className="text-white">{team.athletes.length}</span>{' '}
                          {team.athletes.length !== 1 ? 'Athletes' : 'Athlete'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                        <span className="text-xs text-gray-400">
                          <span className="text-white">{team.workouts.length}</span>{' '}
                          {team.workouts.length !== 1 ? 'Workouts' : 'Workout'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <div className="w-1 h-1 rounded-full bg-gray-600"></div>
                        {new Date(team.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteTeam(team.id)}
                  className="text-gray-400 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-500/10 flex-shrink-0"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Team Content */}
            {expandedTeams.has(team.id) && (
              <div className="p-6 space-y-6">
                {/* Athletes Section */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-white text-lg">Team Members</h4>
                    <button
                      onClick={() => {
                        setSelectedTeam(team);
                        setShowAthleteModal(true);
                        setAthleteSearch('');
                      }}
                      className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-gray-300 hover:text-white px-4 py-2 rounded-lg transition-all border border-zinc-700 hover:border-[#F56E0F]/50"
                    >
                      <UserPlus className="w-4 h-4" />
                      Add Athletes
                    </button>
                  </div>

                  {team.athletes.length > 0 ? (
                    <div className="grid md:grid-cols-2 gap-3">
                      {team.athletes.map((athlete) => (
                        <div
                          key={athlete.id}
                          className="bg-black/40 border border-zinc-700 rounded-xl p-4 flex items-center justify-between group hover:border-zinc-600 transition-all"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-zinc-700 to-zinc-800 rounded-lg flex items-center justify-center">
                              <Users className="w-5 h-5 text-gray-400" />
                            </div>
                            <div>
                              <h5 className="text-white">{athlete.name}</h5>
                              <p className="text-sm text-gray-500">{athlete.email}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleRemoveAthleteFromTeam(team.id, athlete.id)}
                            className="text-gray-500 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-black/20 border border-zinc-800 rounded-xl p-8 text-center">
                      <Users className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-500">No athletes added yet</p>
                      <p className="text-sm text-gray-600 mt-1">
                        Click "Add Athletes" to build your team
                      </p>
                    </div>
                  )}
                </div>

                {/* Team Workouts Section */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-white text-lg">Team Workouts</h4>
                    <button
                      onClick={() => {
                        setSelectedTeam(team);
                        setShowWorkoutModal(true);
                        startNewWorkout();
                      }}
                      className="flex items-center gap-2 bg-[#F56E0F]/10 hover:bg-[#F56E0F]/20 text-[#F56E0F] px-4 py-2 rounded-lg transition-all border border-[#F56E0F]/30 hover:border-[#F56E0F]/50"
                    >
                      <Plus className="w-4 h-4" />
                      Create Team Workout
                    </button>
                  </div>

                  {team.workouts.length > 0 ? (
                    <div className="grid gap-3">
                      {team.workouts.map((workout) => (
                        <div
                          key={workout.id}
                          className="bg-black/40 border border-zinc-700 rounded-xl p-4 hover:border-[#F56E0F]/30 transition-all"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-[#F56E0F]/10 rounded-lg flex items-center justify-center">
                                <Calendar className="w-5 h-5 text-[#F56E0F]" />
                              </div>
                              <div>
                                <h5 className="text-white">{workout.name}</h5>
                                <p className="text-sm text-gray-500">
                                  {(() => {
                                    // Parse date as local date to avoid timezone issues
                                    const [year, month, day] = workout.date.split('-').map(Number);
                                    const date = new Date(year, month - 1, day);
                                    return date.toLocaleDateString('en-US', {
                                      weekday: 'short',
                                      month: 'short',
                                      day: 'numeric',
                                    });
                                  })()}
                                </p>
                              </div>
                            </div>
                            <div className="text-sm text-gray-400">
                              {workout.blocks.length} block
                              {workout.blocks.length !== 1 ? 's' : ''}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-black/20 border border-zinc-800 rounded-xl p-8 text-center">
                      <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-500">No team workouts created yet</p>
                      <p className="text-sm text-gray-600 mt-1">
                        Team workouts will be assigned to all members
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        {teams.length === 0 && (
          <div className="bg-[#1B1B1E] border border-zinc-800 rounded-2xl p-12 text-center">
            <div className="w-20 h-20 bg-[#F56E0F]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Users className="w-10 h-10 text-[#F56E0F]" />
            </div>
            <h3 className="text-white text-xl mb-2">No Teams Yet</h3>
            <p className="text-gray-400 mb-6">
              Create your first team to start organizing athletes and workouts
            </p>
            <button
              onClick={() => setShowTeamModal(true)}
              className="flex items-center gap-2 bg-[#F56E0F] hover:bg-[#E05D00] text-white px-6 py-3 rounded-xl transition-all mx-auto"
            >
              <Plus className="w-5 h-5" />
              Team
            </button>
          </div>
        )}
      </div>

      {/* Create Team Modal */}
      {showTeamModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#1B1B1E] border border-zinc-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-white text-2xl mb-6">Create New Team</h3>
            <form onSubmit={handleCreateTeam} className="space-y-4">
              <div>
                <label className="block text-gray-400 mb-2">Team Name</label>
                <input
                  type="text"
                  value={newTeam.name}
                  onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
                  className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#F56E0F] focus:ring-2 focus:ring-[#F56E0F]/20 transition-all"
                  placeholder="e.g., Varsity Football, JV Basketball"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-gray-400 mb-2">Description</label>
                <textarea
                  value={newTeam.description}
                  onChange={(e) => setNewTeam({ ...newTeam, description: e.target.value })}
                  className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#F56E0F] focus:ring-2 focus:ring-[#F56E0F]/20 transition-all resize-none"
                  placeholder="Brief description of this team..."
                  rows={3}
                  required
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowTeamModal(false);
                    setNewTeam({ name: '', description: '' });
                  }}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-3 rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#F56E0F] hover:bg-[#E05D00] text-white py-3 rounded-xl transition-all shadow-lg shadow-[#F56E0F]/20"
                >
                  Create Team
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Athletes Modal */}
      {showAthleteModal && selectedTeam && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#1B1B1E] border border-zinc-800 rounded-2xl p-6 w-full max-w-2xl shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white text-2xl">Add Athletes to {selectedTeam.name}</h3>
              <button
                onClick={() => {
                  setShowAthleteModal(false);
                  setSelectedTeam(null);
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Search */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={athleteSearch}
                  onChange={(e) => setAthleteSearch(e.target.value)}
                  placeholder="Search athletes..."
                  className="w-full bg-black border border-zinc-700 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-[#F56E0F] focus:ring-2 focus:ring-[#F56E0F]/20 transition-all"
                />
              </div>
            </div>

            {/* Available Athletes */}
            <div className="max-h-96 overflow-y-auto space-y-2">
              {filteredAthletes.length > 0 ? (
                filteredAthletes.map((athlete) => (
                  <div
                    key={athlete.id}
                    onClick={() => {
                      handleAddAthleteToTeam(selectedTeam.id, athlete);
                    }}
                    className="bg-black/40 border border-zinc-700 rounded-xl p-4 flex items-center justify-between hover:border-[#F56E0F]/50 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-zinc-700 to-zinc-800 rounded-lg flex items-center justify-center">
                        <Users className="w-5 h-5 text-gray-400" />
                      </div>
                      <div>
                        <h5 className="text-white">{athlete.name}</h5>
                        <p className="text-sm text-gray-500">{athlete.email}</p>
                      </div>
                    </div>
                    <Plus className="w-5 h-5 text-gray-500 group-hover:text-[#F56E0F] transition-colors" />
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">
                    {athleteSearch
                      ? 'No athletes found matching your search'
                      : 'All athletes have been added to this team'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Team Workout Modal */}
      {showWorkoutModal && selectedTeam && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#1B1B1E] border border-zinc-800 rounded-2xl p-6 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6 sticky top-0 bg-[#1B1B1E] z-10 pb-4">
              <h3 className="text-white text-2xl">Create Team Workout for {selectedTeam.name}</h3>
              <button
                onClick={() => {
                  setShowWorkoutModal(false);
                  setSelectedTeam(null);
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Workout Name */}
            <div className="mb-4">
              <label className="block text-gray-400 mb-2">Workout Name</label>
              <WorkoutTemplateAutocomplete
                value={editingWorkout?.name || ''}
                onChange={(value) => {
                  if (editingWorkout) {
                    setEditingWorkout({ ...editingWorkout, name: value });
                  }
                }}
                onSelectTemplate={(template) => {
                  if (editingWorkout) {
                    // Generate new IDs for blocks and exercises to avoid conflicts
                    const newBlocks = template.blocks.map(block => ({
                      ...block,
                      id: Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9),
                      exercises: block.exercises.map(ex => ({
                        ...ex,
                        id: Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9),
                      })),
                    }));
                    
                    setEditingWorkout({
                      ...editingWorkout,
                      name: template.name,
                      blocks: newBlocks,
                    });
                    
                    // Expand all blocks when template is selected
                    const blockIds = new Set(newBlocks.map(b => b.id));
                    setExpandedBlocks(blockIds);
                  }
                }}
                placeholder="e.g., Strength Training, Cardio Session"
                className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#F56E0F] focus:ring-2 focus:ring-[#F56E0F]/20 transition-all"
              />
            </div>

            {/* Workout Date */}
            <div className="mb-4">
              <label className="block text-gray-400 mb-2">Workout Date</label>
              <input
                type="date"
                value={editingWorkout?.date || ''}
                onChange={(e) => {
                  if (editingWorkout) {
                    setEditingWorkout({ ...editingWorkout, date: e.target.value });
                  }
                }}
                className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#F56E0F] focus:ring-2 focus:ring-[#F56E0F]/20 transition-all"
                required
              />
            </div>

            {/* Blocks */}
            <div className="space-y-4">
              {editingWorkout?.blocks.map((block) => (
                <div key={block.id} className="bg-black/40 border border-zinc-700 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#F56E0F]/10 rounded-lg flex items-center justify-center">
                        <Dumbbell className="w-5 h-5 text-[#F56E0F]" />
                      </div>
                      <div>
                        <h5 className="text-white">{block.name}</h5>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveBlock(block.id)}
                      className="text-gray-500 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Expand/Collapse Block */}
                  <button
                    onClick={() => toggleBlock(block.id)}
                    className="w-full text-left text-gray-400 hover:text-[#F56E0F] transition-colors mt-2"
                  >
                    <ChevronRight
                      className={`w-6 h-6 transition-transform ${
                        expandedBlocks.has(block.id) ? 'rotate-90' : ''
                      }`}
                    />
                    {expandedBlocks.has(block.id) ? 'Collapse' : 'Expand'} Block
                  </button>

                  {/* Block Content */}
                  {expandedBlocks.has(block.id) && (
                    <div className="mt-4">
                      {/* Add Exercise Button */}
                      <button
                        onClick={() => handleAddExerciseToBlock(block.id)}
                        className="flex items-center gap-2 bg-[#F56E0F]/10 hover:bg-[#F56E0F]/20 text-[#F56E0F] px-4 py-2 rounded-lg transition-all border border-[#F56E0F]/30 hover:border-[#F56E0F]/50"
                      >
                        <Plus className="w-4 h-4" />
                        Add Exercise
                      </button>

                      {/* Exercises */}
                      {block.exercises.map((exercise) => (
                        <div key={exercise.id} className="bg-black/20 border border-zinc-800 rounded-xl p-4 mt-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-[#F56E0F]/10 rounded-lg flex items-center justify-center">
                                <Dumbbell className="w-5 h-5 text-[#F56E0F]" />
                              </div>
                              <div>
                                <h5 className="text-white">{exercise.exerciseName}</h5>
                                <p className="text-sm text-gray-500">
                                  {exercise.sets} sets x {exercise.reps} reps
                                  {exercise.weight ? ` x ${exercise.weight} lbs` : ''}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => handleRemoveExercise(block.id, exercise.id)}
                              className="text-gray-500 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Edit Exercise */}
                          <div className="mt-2">
                            <label className="block text-gray-400 mb-2">Exercise Name</label>
                            <ExerciseAutocomplete
                              value={exercise.exerciseName}
                              onChange={(value) => updateExercise(block.id, exercise.id, 'exerciseName', value)}
                              placeholder="e.g., Squats, Bench Press"
                              className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#F56E0F] focus:ring-2 focus:ring-[#F56E0F]/20 transition-all"
                            />
                          </div>
                          <div className="mt-2">
                            <label className="block text-gray-400 mb-2">Sets</label>
                            <input
                              type="number"
                              value={exercise.sets}
                              onChange={(e) => updateExercise(block.id, exercise.id, 'sets', parseInt(e.target.value))}
                              className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#F56E0F] focus:ring-2 focus:ring-[#F56E0F]/20 transition-all"
                              placeholder="e.g., 3"
                              required
                            />
                          </div>
                          <div className="mt-2">
                            <label className="block text-gray-400 mb-2">Reps</label>
                            <input
                              type="text"
                              value={exercise.reps}
                              onChange={(e) => updateExercise(block.id, exercise.id, 'reps', e.target.value)}
                              className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#F56E0F] focus:ring-2 focus:ring-[#F56E0F]/20 transition-all"
                              placeholder="e.g., 10"
                              required
                            />
                          </div>
                          <div className="mt-2">
                            <label className="block text-gray-400 mb-2">Weight (lbs)</label>
                            <input
                              type="text"
                              value={exercise.weight || ''}
                              onChange={(e) => updateExercise(block.id, exercise.id, 'weight', e.target.value)}
                              className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#F56E0F] focus:ring-2 focus:ring-[#F56E0F]/20 transition-all"
                              placeholder="e.g., 100"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* Add Block Button */}
              <button
                onClick={() => setShowBlockModal(true)}
                className="flex items-center gap-2 bg-[#F56E0F]/10 hover:bg-[#F56E0F]/20 text-[#F56E0F] px-4 py-2 rounded-lg transition-all border border-[#F56E0F]/30 hover:border-[#F56E0F]/50"
              >
                <Plus className="w-4 h-4" />
                Add Block
              </button>
            </div>

            {/* Save Workout Button */}
            <button
              onClick={handleSaveWorkout}
              className="w-full bg-[#F56E0F] hover:bg-[#E05D00] text-white py-3 rounded-xl transition-all mt-6"
            >
              Save Workout
            </button>
          </div>
        </div>
      )}

      {/* Add Block Modal */}
      {showBlockModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#1B1B1E] border border-zinc-800 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-white text-2xl mb-4">Add New Block</h3>
            <div className="mb-4">
              <label className="block text-gray-400 mb-2">Block Name</label>
              <input
                type="text"
                value={newBlockName}
                onChange={(e) => setNewBlockName(e.target.value)}
                className="w-full bg-black border border-zinc-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#F56E0F] focus:ring-2 focus:ring-[#F56E0F]/20 transition-all"
                placeholder="e.g., Warm-up, Strength Training"
                required
              />
            </div>
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => setShowBlockModal(false)}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-3 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddBlock}
                className="flex-1 bg-[#F56E0F] hover:bg-[#E05D00] text-white py-3 rounded-xl transition-all shadow-lg shadow-[#F56E0F]/20"
              >
                Add Block
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}