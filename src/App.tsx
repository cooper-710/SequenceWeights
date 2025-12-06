import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AdminDashboard } from './components/AdminDashboard';
import { UserDashboard } from './components/UserDashboard';
import { WorkoutViewer } from './components/WorkoutViewer';
import { ExerciseDetail } from './components/ExerciseDetail';
import { LoadingScreen } from './components/LoadingScreen';
import { getTokenFromUrl, addTokenToUrl, getPlayerFromUrl, addPlayerToUrl } from './utils/tokenNavigation';

// Admin token - in production, this should be set via environment variable
const ADMIN_TOKEN = import.meta.env.VITE_ADMIN_TOKEN || 'admin-sequence-2024-secure-token';

// Component to handle token-based or player name-based routes (automatic login)
function TokenRoute({ onSetUser, onLogout }: { onSetUser: (user: { id: string; name: string; role: 'admin' | 'user' }) => void; onLogout: () => void }) {
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ id: string; name: string; role: 'admin' | 'user' } | null>(null);

  useEffect(() => {
    // Get token or player name from query parameters - use window.location first
    // This ensures we get query params even if React Router hasn't initialized them yet
    const searchString = window.location.search || location.search;
    const searchParams = new URLSearchParams(searchString);
    const token = searchParams.get('token');
    const playerName = searchParams.get('player');
    const mode = searchParams.get('mode');

    const handleTokenLogin = async (loginToken: string) => {
      setLoading(true);
      try {
        const response = await fetch(`/api/auth/login?token=${encodeURIComponent(loginToken)}`);
        if (response.ok) {
          const data = await response.json();
          const userData = data.user;
          
          // Don't store anything - just use token from URL
          setUser(userData);
          onSetUser(userData);
          // Cache the user to avoid re-authentication
          (window as any).__cachedUser = userData;
          
          // Keep token in URL - update URL to /login?token=xxx (or /user?token=xxx)
          const newUrl = addTokenToUrl('/user', loginToken);
          window.history.replaceState({}, '', newUrl);
        } else {
          // Show error message
          alert('Invalid login link. Please contact your coach for a new link.');
        }
      } catch (err) {
        console.error('Failed to login:', err);
        alert('Failed to connect. Please check your internet connection.');
      } finally {
        setLoading(false);
      }
    };

    const handlePlayerLogin = async (name: string) => {
      setLoading(true);
      try {
        // URLSearchParams.get() already decodes the value, so name is already decoded
        // Encode for API call, but use + for spaces in query parameters
        const encodedForApi = encodeURIComponent(name).replace(/%20/g, '+');
        const response = await fetch(`/api/auth/by-name?player=${encodedForApi}`);
        if (response.ok) {
          const data = await response.json();
          const userData = data.user;
          
          setUser(userData);
          onSetUser(userData);
          // Cache the user to avoid re-authentication
          (window as any).__cachedUser = userData;
          
          // Keep player name in URL - update URL to /user?mode=player&player=Name (spaces as +)
          const encodedName = encodeURIComponent(name).replace(/%20/g, '+');
          const newUrl = `/user?mode=player&player=${encodedName}`;
          window.history.replaceState({}, '', newUrl);
        } else {
          // Show error message
          alert('Invalid login link. Please contact your coach for a new link.');
        }
      } catch (err) {
        console.error('Failed to login:', err);
        alert('Failed to connect. Please check your internet connection.');
      } finally {
        setLoading(false);
      }
    };

    if (playerName && mode === 'player') {
      // Player name in URL - use it to login
      handlePlayerLogin(playerName);
    } else if (token) {
      // Token in URL - use it to login
      handleTokenLogin(token);
    } else {
      // No token or player name in URL - show error
      setLoading(false);
    }
  }, [location.search, onSetUser]);

  const handleLogout = () => {
    setUser(null);
    onSetUser(null);
    (window as any).__cachedUser = null;
    onLogout();
  };

  if (loading) {
    return <LoadingScreen />;
  }

  if (user?.role === 'user') {
    return <UserDashboard user={user} onLogout={handleLogout} />;
  }

  // No valid user - show error message
  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-white text-2xl mb-4">Invalid or Expired Link</h1>
        <p className="text-gray-400">Please contact your coach for a new login link.</p>
      </div>
    </div>
  );
}

// Component to handle admin token-based routes
function AdminTokenRoute({ onSetUser, onLogout, parentUser }: { 
  onSetUser: (user: { id: string; name: string; role: 'admin' | 'user' }) => void; 
  onLogout: () => void;
  parentUser: { id: string; name: string; role: 'admin' | 'user' } | null;
}) {
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ id: string; name: string; role: 'admin' | 'user' } | null>(null);

  useEffect(() => {
    // Use window.location first to ensure query params are available on webapp launch
    const searchString = window.location.search || location.search;
    const searchParams = new URLSearchParams(searchString);
    const token = searchParams.get('token');

    const handleAdminLogin = (adminToken: string) => {
      setLoading(true);
      
      // Check if token matches admin token
      if (adminToken === ADMIN_TOKEN) {
        const adminUser = {
          id: 'admin-1',
          name: 'Admin User',
          role: 'admin' as const,
        };
        
        // Don't store anything - just use token from URL
        setUser(adminUser);
        onSetUser(adminUser);
        // Cache the user to avoid re-authentication
        (window as any).__cachedUser = adminUser;
        
        // Keep token in URL
        const newUrl = addTokenToUrl('/admin', adminToken);
        window.history.replaceState({}, '', newUrl);
      } else {
        alert('Invalid admin token. Please use the correct admin link.');
      }
      
      setLoading(false);
    };

    // Check if already logged in as admin from parent (if they have token in URL)
    if (parentUser?.role === 'admin') {
      const parentToken = getTokenFromUrl();
      if (parentToken === ADMIN_TOKEN) {
        setUser(parentUser);
        setLoading(false);
        return;
      }
    }

    if (token) {
      // Token in URL - validate it
      handleAdminLogin(token);
    } else {
      // No token in URL - show error
      setLoading(false);
    }
  }, [location.search, onSetUser, parentUser]);

  const handleLogout = () => {
    setUser(null);
    onSetUser(null);
    (window as any).__cachedUser = null;
    onLogout();
  };

  if (loading) {
    return <LoadingScreen />;
  }

  if (user?.role === 'admin') {
    return <AdminDashboard user={user} onLogout={handleLogout} />;
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-white text-2xl mb-4">Invalid Admin Token</h1>
        <p className="text-gray-400">Please use the correct admin login link.</p>
      </div>
    </div>
  );
}

// Component to handle root route
function RootRoute({ user, onSetUser }: { 
  user: { id: string; name: string; role: 'admin' | 'user' } | null;
  onSetUser: (user: { id: string; name: string; role: 'admin' | 'user' }) => void;
}) {
  const location = useLocation();

  // Check for player name or token in query params - use window.location first
  // This is critical for PWA/home screen launches where React Router's location.search
  // may not be populated yet on initial render
  const searchString = window.location.search || location.search;
  const searchParams = new URLSearchParams(searchString);
  const playerName = searchParams.get('player');
  const mode = searchParams.get('mode');
  const token = searchParams.get('token');
  
  if (playerName && mode === 'player') {
    // Player name in URL - redirect to login route (spaces as +)
    const encodedName = encodeURIComponent(playerName).replace(/%20/g, '+');
    return <Navigate to={`/login?mode=player&player=${encodedName}`} replace />;
  }
  
  if (token) {
    // Check if it's admin token or user token
    if (token === ADMIN_TOKEN) {
      return <Navigate to={`/admin?token=${token}`} replace />;
    } else {
      return <Navigate to={`/login?token=${token}`} replace />;
    }
  }

  if (user) {
    const currentPlayer = getPlayerFromUrl();
    const currentToken = getTokenFromUrl();
    if (user.role === 'admin') {
      return <Navigate to={addTokenToUrl('/admin', currentToken)} replace />;
    } else {
      if (currentPlayer) {
        return <Navigate to={addPlayerToUrl('/user', currentPlayer)} replace />;
      } else {
        return <Navigate to={addTokenToUrl('/user', currentToken)} replace />;
      }
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-white text-2xl mb-4">No Login Link</h1>
        <p className="text-gray-400">Please use the login link provided by your coach.</p>
      </div>
    </div>
  );
}

// Protected route wrapper that checks token or player name from URL
function ProtectedRoute({ 
  children, 
  requiredRole, 
  onSetUser,
  render
}: { 
  children?: React.ReactNode;
  requiredRole?: 'admin' | 'user';
  onSetUser: (user: { id: string; name: string; role: 'admin' | 'user' }) => void;
  render?: (user: { id: string; name: string; role: 'admin' | 'user' }) => React.ReactNode;
}) {
  const location = useLocation();
  const [user, setUser] = useState<{ id: string; name: string; role: 'admin' | 'user' } | null>(null);
  const [loading, setLoading] = useState(true);
  // Use window.location first to ensure query params are available on webapp launch
  const searchString = window.location.search || location.search;
  const searchParams = new URLSearchParams(searchString);
  const token = getTokenFromUrl();
  const playerName = searchParams.get('player');
  const mode = searchParams.get('mode');

  useEffect(() => {
    const cachedUser = (window as any).__cachedUser;
    
    // If no token/player but we have a cached user, use it (for bookmark launches)
    if (!token && !(playerName && mode === 'player')) {
      if (cachedUser) {
        setUser(cachedUser);
        onSetUser(cachedUser);
        setLoading(false);
        return;
      }
      setLoading(false);
      return;
    }

    const authenticate = async () => {
      // Check if admin token
      if (token === ADMIN_TOKEN) {
        const adminUser = {
          id: 'admin-1',
          name: 'Admin User',
          role: 'admin' as const,
        };
        setUser(adminUser);
        onSetUser(adminUser);
        // Cache the user to avoid re-authentication
        (window as any).__cachedUser = adminUser;
        setLoading(false);
        return;
      }

      // Check if user token or player name - use cached user if available to avoid re-authentication
      if (cachedUser && cachedUser.role === 'user') {
        setUser(cachedUser);
        onSetUser(cachedUser);
        setLoading(false);
        return;
      }

      // Check if player name authentication
      if (playerName && mode === 'player') {
        try {
          // URLSearchParams.get() already decodes the value
          // Encode for API call, but use + for spaces in query parameters
          const encodedForApi = encodeURIComponent(playerName).replace(/%20/g, '+');
          const response = await fetch(`/api/auth/by-name?player=${encodedForApi}`);
          if (response.ok) {
            const data = await response.json();
            const userData = data.user;
            setUser(userData);
            onSetUser(userData);
            // Cache the user to avoid re-authentication
            (window as any).__cachedUser = userData;
          }
        } catch (err) {
          console.error('Failed to authenticate:', err);
        } finally {
          setLoading(false);
        }
        return;
      }

      // Check if user token - only authenticate if we don't have cached user
      if (token) {
        try {
          const response = await fetch(`/api/auth/login?token=${encodeURIComponent(token)}`);
          if (response.ok) {
            const data = await response.json();
            const userData = data.user;
            setUser(userData);
            onSetUser(userData);
            // Cache the user to avoid re-authentication
            (window as any).__cachedUser = userData;
          }
        } catch (err) {
          console.error('Failed to authenticate:', err);
        } finally {
          setLoading(false);
        }
      }
    };

    authenticate();
  }, [token, playerName, mode, onSetUser]); // Removed location dependency to avoid re-auth on navigation

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    if (playerName && mode === 'player') {
      return <Navigate to={addPlayerToUrl('/', playerName)} replace />;
    }
    return <Navigate to={addTokenToUrl('/', token)} replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    if (playerName && mode === 'player') {
      return <Navigate to={addPlayerToUrl('/', playerName)} replace />;
    }
    return <Navigate to={addTokenToUrl('/', token)} replace />;
  }

  if (render) {
    return <>{render(user)}</>;
  }

  return <>{children}</>;
}

function AppContent() {
  const [user, setUser] = useState<{ id: string; name: string; role: 'admin' | 'user' } | null>(null);
  const [loading, setLoading] = useState(false);
  const location = useLocation();

  // Cache user state to avoid re-authentication
  useEffect(() => {
    if (user) {
      (window as any).__cachedUser = user;
    }
  }, [user]);

  // Try to restore user from cache on mount
  useEffect(() => {
    const cachedUser = (window as any).__cachedUser;
    const token = getTokenFromUrl();
    const playerName = getPlayerFromUrl();
    
    // If we have a cached user, restore it (for bookmark/home screen launches)
    if (cachedUser) {
      // Verify token matches if present
      if (token === ADMIN_TOKEN && cachedUser.role === 'admin') {
        setUser(cachedUser);
      } else if (cachedUser.role === 'user') {
        // For user role, restore if we have token/player OR if launching from bookmark (no params)
        // This allows the app to work when launched from home screen bookmark
        if (token || playerName || (!token && !playerName)) {
          setUser(cachedUser);
        }
      }
    }
  }, []);

  const handleLogout = () => {
    setUser(null);
    (window as any).__cachedUser = null;
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-black">
      <Routes>
        {/* Root route - redirect based on user or show message */}
        <Route path="/" element={<RootRoute user={user} onSetUser={setUser} />} />
        
        {/* Token-based login routes - use query parameters */}
        <Route path="/login" element={<TokenRoute onSetUser={setUser} onLogout={handleLogout} />} />
        
        {/* Workout route - requires user and token */}
        <Route path="/workout/:workoutId" element={
          <ProtectedRoute 
            onSetUser={setUser}
            render={(user) => <WorkoutViewer userId={user.id} onBack={() => window.history.back()} />}
          />
        } />
        
        {/* Exercise route - requires user and token */}
        <Route path="/exercise/:workoutId/:exerciseName" element={
          <ProtectedRoute 
            onSetUser={setUser}
            render={(user) => <ExerciseDetail userId={user.id} onBack={() => window.history.back()} />}
          />
        } />
        
        {/* User dashboard route - requires user and token */}
        <Route path="/user" element={
          <ProtectedRoute 
            requiredRole="user" 
            onSetUser={setUser}
            render={(user) => <UserDashboard user={user} onLogout={handleLogout} />}
          />
        } />
        
        {/* Admin route - handles both token login and dashboard */}
        <Route path="/admin" element={<AdminTokenRoute onSetUser={setUser} onLogout={handleLogout} parentUser={user} />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
