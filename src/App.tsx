import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import { AdminDashboard } from './components/AdminDashboard';
import { UserDashboard } from './components/UserDashboard';
import { WorkoutViewer } from './components/WorkoutViewer';
import { ExerciseDetail } from './components/ExerciseDetail';

// Storage keys
const STORAGE_TOKEN_KEY = 'athlete_login_token';
const STORAGE_USER_KEY = 'athlete_user';
const STORAGE_ADMIN_TOKEN_KEY = 'admin_login_token';
const STORAGE_ADMIN_USER_KEY = 'admin_user';

// Admin token - in production, this should be set via environment variable
const ADMIN_TOKEN = import.meta.env.VITE_ADMIN_TOKEN || 'admin-sequence-2024-secure-token';

// Helper to safely use localStorage with fallback to sessionStorage
const storage = {
  getItem: (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn('localStorage not available:', e);
      try {
        return sessionStorage.getItem(key);
      } catch (e2) {
        console.warn('sessionStorage not available:', e2);
        return null;
      }
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      localStorage.setItem(key, value);
      // Also store in sessionStorage as backup
      sessionStorage.setItem(key, value);
    } catch (e) {
      console.warn('Failed to store in localStorage:', e);
      // Fallback to sessionStorage only
      try {
        sessionStorage.setItem(key, value);
      } catch (e2) {
        console.warn('Failed to store in sessionStorage:', e2);
      }
    }
  },
  removeItem: (key: string): void => {
    try {
      localStorage.removeItem(key);
      sessionStorage.removeItem(key);
    } catch (e) {
      console.warn('Failed to remove from storage:', e);
    }
  }
};

// Component to handle token-based routes (automatic login)
function TokenRoute({ onSetUser, onLogout }: { onSetUser: (user: { id: string; name: string; role: 'admin' | 'user' }) => void; onLogout: () => void }) {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ id: string; name: string; role: 'admin' | 'user' } | null>(null);

  useEffect(() => {
    const handleTokenLogin = async (loginToken: string) => {
      setLoading(true);
      try {
        const response = await fetch(`/api/auth/login?token=${encodeURIComponent(loginToken)}`);
        if (response.ok) {
          const data = await response.json();
          const userData = data.user;
          
          // Store token and user in both localStorage and sessionStorage
          storage.setItem(STORAGE_TOKEN_KEY, loginToken);
          storage.setItem(STORAGE_USER_KEY, JSON.stringify(userData));
          
          setUser(userData);
          onSetUser(userData);
        } else {
          // Clear invalid token
          storage.removeItem(STORAGE_TOKEN_KEY);
          storage.removeItem(STORAGE_USER_KEY);
          // Show error message
          alert('Invalid login link. Please contact your coach for a new link.');
        }
      } catch (err) {
        console.error('Failed to login:', err);
        storage.removeItem(STORAGE_TOKEN_KEY);
        storage.removeItem(STORAGE_USER_KEY);
        alert('Failed to connect. Please check your internet connection.');
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      // Token in URL - use it to login
      handleTokenLogin(token);
    } else {
      // No token in URL - check storage (try localStorage first, then sessionStorage)
      const storedToken = storage.getItem(STORAGE_TOKEN_KEY) || sessionStorage.getItem(STORAGE_TOKEN_KEY);
      const storedUser = storage.getItem(STORAGE_USER_KEY) || sessionStorage.getItem(STORAGE_USER_KEY);
      
      if (storedToken && storedUser) {
        // Validate stored token
        handleTokenLogin(storedToken);
      } else {
        // No token anywhere - show error
        setLoading(false);
      }
    }
  }, [token, onSetUser]);

  const handleLogout = () => {
    storage.removeItem(STORAGE_TOKEN_KEY);
    storage.removeItem(STORAGE_USER_KEY);
    setUser(null);
    onSetUser(null);
    onLogout();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
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
function AdminTokenRoute({ onSetUser, onLogout }: { onSetUser: (user: { id: string; name: string; role: 'admin' | 'user' }) => void; onLogout: () => void }) {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ id: string; name: string; role: 'admin' | 'user' } | null>(null);

  useEffect(() => {
    const handleAdminLogin = (adminToken: string) => {
      setLoading(true);
      
      // Check if token matches admin token
      if (adminToken === ADMIN_TOKEN) {
        const adminUser = {
          id: 'admin-1',
          name: 'Admin User',
          role: 'admin' as const,
        };
        
        // Store admin token and user
        storage.setItem(STORAGE_ADMIN_TOKEN_KEY, adminToken);
        storage.setItem(STORAGE_ADMIN_USER_KEY, JSON.stringify(adminUser));
        
        setUser(adminUser);
        onSetUser(adminUser);
      } else {
        storage.removeItem(STORAGE_ADMIN_TOKEN_KEY);
        storage.removeItem(STORAGE_ADMIN_USER_KEY);
        alert('Invalid admin token. Please use the correct admin link.');
      }
      
      setLoading(false);
    };

    if (token) {
      // Token in URL - validate it
      handleAdminLogin(token);
    } else {
      // No token in URL - check storage
      const storedToken = storage.getItem(STORAGE_ADMIN_TOKEN_KEY) || sessionStorage.getItem(STORAGE_ADMIN_TOKEN_KEY);
      const storedUser = storage.getItem(STORAGE_ADMIN_USER_KEY) || sessionStorage.getItem(STORAGE_ADMIN_USER_KEY);
      
      if (storedToken && storedUser) {
        // Validate stored token
        handleAdminLogin(storedToken);
      } else {
        setLoading(false);
      }
    }
  }, [token, onSetUser]);

  const handleLogout = () => {
    storage.removeItem(STORAGE_ADMIN_TOKEN_KEY);
    storage.removeItem(STORAGE_ADMIN_USER_KEY);
    setUser(null);
    onSetUser(null);
    onLogout();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
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

function AppContent() {
  const [user, setUser] = useState<{ id: string; name: string; role: 'admin' | 'user' } | null>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  // On mount, check localStorage for existing user (check admin first, then regular user)
  useEffect(() => {
    // Check for admin first
    const adminToken = storage.getItem(STORAGE_ADMIN_TOKEN_KEY) || sessionStorage.getItem(STORAGE_ADMIN_TOKEN_KEY);
    const adminUser = storage.getItem(STORAGE_ADMIN_USER_KEY) || sessionStorage.getItem(STORAGE_ADMIN_USER_KEY);
    
    if (adminToken && adminUser && adminToken === ADMIN_TOKEN) {
      try {
        const userData = JSON.parse(adminUser);
        setUser(userData);
        setLoading(false);
        return;
      } catch (err) {
        console.error('Failed to parse stored admin user:', err);
        storage.removeItem(STORAGE_ADMIN_TOKEN_KEY);
        storage.removeItem(STORAGE_ADMIN_USER_KEY);
      }
    }
    
    // Check for regular user
    const storedToken = storage.getItem(STORAGE_TOKEN_KEY) || sessionStorage.getItem(STORAGE_TOKEN_KEY);
    const storedUser = storage.getItem(STORAGE_USER_KEY) || sessionStorage.getItem(STORAGE_USER_KEY);
    
    if (storedToken && storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setUser(userData);
      } catch (err) {
        console.error('Failed to parse stored user:', err);
        storage.removeItem(STORAGE_TOKEN_KEY);
        storage.removeItem(STORAGE_USER_KEY);
      }
    }
    setLoading(false);
  }, []);

  const handleLogout = () => {
    storage.removeItem(STORAGE_TOKEN_KEY);
    storage.removeItem(STORAGE_USER_KEY);
    storage.removeItem(STORAGE_ADMIN_TOKEN_KEY);
    storage.removeItem(STORAGE_ADMIN_USER_KEY);
    setUser(null);
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-black">
      <Routes>
        {/* Root route - redirect based on user or show message */}
        <Route path="/" element={
          loading ? (
            <div className="min-h-screen bg-black flex items-center justify-center">
              <div className="text-white">Loading...</div>
            </div>
          ) : user ? (
            user.role === 'admin' ? (
              <Navigate to="/admin" replace />
            ) : (
              <Navigate to="/user" replace />
            )
          ) : (
            <div className="min-h-screen bg-black flex items-center justify-center px-4">
              <div className="text-center">
                <h1 className="text-white text-2xl mb-4">No Login Link</h1>
                <p className="text-gray-400">Please use the login link provided by your coach.</p>
              </div>
            </div>
          )
        } />
        
        {/* Token-based login routes - must come before catch-all routes */}
        <Route path="/login/:token" element={<TokenRoute onSetUser={setUser} onLogout={handleLogout} />} />
        <Route path="/admin/:token" element={<AdminTokenRoute onSetUser={setUser} onLogout={handleLogout} />} />
        
        {/* Workout route - requires user */}
        <Route path="/workout/:workoutId" element={
          user ? (
            <WorkoutViewer userId={user.id} onBack={() => window.history.back()} />
          ) : (
            <Navigate to="/" replace />
          )
        } />
        
        {/* Exercise route - requires user */}
        <Route path="/exercise/:workoutId/:exerciseName" element={
          user ? (
            <ExerciseDetail userId={user.id} onBack={() => window.history.back()} />
          ) : (
            <Navigate to="/" replace />
          )
        } />
        
        {/* User dashboard route - requires user */}
        <Route path="/user" element={
          user?.role === 'user' ? (
            <UserDashboard user={user} onLogout={handleLogout} />
          ) : (
            <Navigate to="/" replace />
          )
        } />
        
        {/* Admin route - catch-all must come after specific routes */}
        <Route path="/admin/*" element={
          user?.role === 'admin' ? (
            <AdminDashboard user={user} onLogout={handleLogout} />
          ) : (
            <div className="min-h-screen bg-black flex items-center justify-center px-4">
              <div className="text-center">
                <h1 className="text-white text-2xl mb-4">Admin Access Required</h1>
                <p className="text-gray-400">Please use the admin login link.</p>
              </div>
            </div>
          )
        } />
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
