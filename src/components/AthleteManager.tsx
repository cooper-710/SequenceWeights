import { useState, useEffect } from 'react';
import { Plus, Search, Mail, UserCircle, Copy, Check, Trash2 } from 'lucide-react';
import { athletesApi, Athlete } from '../utils/api';
import { slugifyName } from '../utils/nameUtils';

interface AthleteManagerProps {
  onSelectAthlete: (athlete: Athlete) => void;
}

export function AthleteManager({ onSelectAthlete }: AthleteManagerProps) {
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [newAthlete, setNewAthlete] = useState({ name: '', email: '', password: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [createdAthlete, setCreatedAthlete] = useState<Athlete | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [copiedAthleteId, setCopiedAthleteId] = useState<string | null>(null);
  const [deletingAthleteId, setDeletingAthleteId] = useState<string | null>(null);

  // Load athletes from API on mount
  useEffect(() => {
    loadAthletes();
  }, []);

  const loadAthletes = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await athletesApi.getAll();
      setAthletes(data);
    } catch (err) {
      console.error('Failed to load athletes:', err);
      setError('Failed to load athletes. Make sure the backend server is running.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAthlete = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const athlete = await athletesApi.create({
        name: newAthlete.name,
        email: newAthlete.email,
        password: newAthlete.password,
      });
      setAthletes([...athletes, athlete]);
      setNewAthlete({ name: '', email: '', password: '' });
      setShowModal(false);
      setCreatedAthlete(athlete); // Show login link modal
      setLinkCopied(false);
    } catch (err: any) {
      console.error('Failed to create athlete:', err);
      alert(err.message || 'Failed to create athlete. Please try again.');
    }
  };

  const getLoginLink = (athlete: Athlete) => {
    if (!athlete.name) return '';
    
    // In production, use the production URL from environment variable
    // In development, use current origin
    const baseUrl = import.meta.env.PROD 
      ? (import.meta.env.VITE_APP_URL || 'https://sequence-weights-git-main-cooper-710s-projects.vercel.app')
      : window.location.origin;
    
    const nameSlug = slugifyName(athlete.name);
    return `${baseUrl}/${nameSlug}`;
  };

  const handleCopyLink = (link: string, athleteId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation(); // Prevent card click
    }
    navigator.clipboard.writeText(link);
    setCopiedAthleteId(athleteId);
    setTimeout(() => setCopiedAthleteId(null), 2000);
  };

  const handleDeleteAthlete = async (athlete: Athlete, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    
    if (!confirm(`Are you sure you want to delete ${athlete.name}? This action cannot be undone.`)) {
      return;
    }

    try {
      setDeletingAthleteId(athlete.id);
      await athletesApi.delete(athlete.id);
      setAthletes(athletes.filter(a => a.id !== athlete.id));
    } catch (err: any) {
      console.error('Failed to delete athlete:', err);
      alert(err.message || 'Failed to delete athlete. Please try again.');
    } finally {
      setDeletingAthleteId(null);
    }
  };

  // Filter athletes based on search term
  const filteredAthletes = athletes.filter(athlete =>
    athlete.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    athlete.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-white">Loading athletes...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500 rounded-lg p-6">
        <p className="text-red-400 mb-4">{error}</p>
        <button
          onClick={loadAthletes}
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
        <h2 className="text-white text-2xl">Athletes</h2>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Athlete
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search athletes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-10 pr-4 py-3 text-white focus:outline-none focus:border-orange-500"
          />
        </div>
      </div>

      {/* Athletes List */}
      <div className="grid gap-4">
        {filteredAthletes.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            {searchTerm ? 'No athletes found matching your search.' : 'No athletes yet. Add your first athlete!'}
          </div>
        ) : (
          filteredAthletes.map((athlete) => {
            const loginLink = getLoginLink(athlete);
            const isCopied = copiedAthleteId === athlete.id;
            const isDeleting = deletingAthleteId === athlete.id;
            
            return (
              <div
                key={athlete.id}
                onClick={() => onSelectAthlete(athlete)}
                className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 hover:border-zinc-700 transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center">
                      <UserCircle className="w-8 h-8 text-gray-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-white">{athlete.name}</h3>
                      <p className="text-sm text-gray-400">{athlete.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => {
                        if (loginLink) {
                          handleCopyLink(loginLink, athlete.id, e);
                        } else {
                          e.stopPropagation();
                          alert('No name available for this athlete. Please refresh or contact support.');
                        }
                      }}
                      disabled={isCopied || !loginLink}
                      className={`
                        flex items-center gap-2 px-3 py-2 rounded-lg transition-colors
                        ${isCopied 
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                          : loginLink
                            ? 'bg-zinc-800 hover:bg-zinc-700 text-gray-400 hover:text-white border border-zinc-700'
                            : 'bg-zinc-800/50 text-gray-500 border border-zinc-700/50 cursor-not-allowed opacity-50'
                        }
                      `}
                      title={loginLink ? "Copy login link" : "No name available"}
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-4 h-4" />
                          <span className="text-sm">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span className="text-sm">Copy Link</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={(e) => handleDeleteAthlete(athlete, e)}
                      disabled={isDeleting}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800 hover:bg-red-500/20 border border-zinc-700 hover:border-red-500/30 transition-colors disabled:opacity-50 group"
                      title="Delete athlete"
                    >
                      <Trash2 className="w-4 h-4 text-white group-hover:text-red-400 transition-colors" />
                      {isDeleting && <span className="text-sm text-red-400">Deleting...</span>}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Athlete Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-white text-xl mb-4">Add New Athlete</h3>
            <form onSubmit={handleAddAthlete} className="space-y-4">
              <div>
                <label className="block text-gray-400 mb-2">Full Name</label>
                <input
                  type="text"
                  value={newAthlete.name}
                  onChange={(e) => setNewAthlete({ ...newAthlete, name: e.target.value })}
                  className="w-full bg-black border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-orange-500"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-400 mb-2">Email</label>
                <input
                  type="email"
                  value={newAthlete.email}
                  onChange={(e) => setNewAthlete({ ...newAthlete, email: e.target.value })}
                  className="w-full bg-black border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-orange-500"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-400 mb-2">Password</label>
                <input
                  type="password"
                  value={newAthlete.password}
                  onChange={(e) => setNewAthlete({ ...newAthlete, password: e.target.value })}
                  className="w-full bg-black border border-zinc-800 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-orange-500"
                  required
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-2 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-lg transition-colors"
                >
                  Add Athlete
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Login Link Modal */}
      {createdAthlete && createdAthlete.name && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-white text-xl mb-4">Athlete Created Successfully!</h3>
            <p className="text-gray-400 mb-4">Share this login link with {createdAthlete.name}:</p>
            <div className="bg-black border border-zinc-800 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={getLoginLink(createdAthlete)}
                  className="flex-1 bg-transparent text-white text-sm focus:outline-none"
                />
                <button
                  onClick={() => handleCopyLink(getLoginLink(createdAthlete), createdAthlete.id)}
                  className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  {linkCopied || copiedAthleteId === createdAthlete.id ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy
                    </>
                  )}
                </button>
              </div>
            </div>
            <button
              onClick={() => setCreatedAthlete(null)}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2 rounded-lg transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}