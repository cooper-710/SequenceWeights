import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import { AdminDashboard } from './components/AdminDashboard';
import { UserDashboard } from './components/UserDashboard';
import { WorkoutViewer } from './components/WorkoutViewer';
import { ExerciseDetail } from './components/ExerciseDetail';
import { LoginScreen } from './components/LoginScreen';
import { slugifyName } from './utils/nameUtils';

// Component to handle name-based routes
function NameRoute({ onSetUser, onLogout }: { onSetUser: (user: { id: string; name: string; role: 'admin' | 'user' }) => void; onLogout: () => void }) {
  const { name } = useParams<{ name: string }>();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ id: string; name: string; role: 'admin' | 'user' } | null>(null);

  useEffect(() => {
    if (!name) {
      setLoading(false);
      return;
    }

    const handleNameLogin = async (nameSlug: string) => {
      setLoading(true);
      try {
        const response = await fetch(`/api/auth/by-name/${encodeURIComponent(nameSlug)}`);
        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
          onSetUser(data.user);
        } else {
          // Redirect to home if login fails
          window.location.href = '/';
          return;
        }
      } catch (err) {
        console.error('Failed to login:', err);
        window.location.href = '/';
        return;
      } finally {
        setLoading(false);
      }
    };

    handleNameLogin(name);
  }, [name, onSetUser]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (user?.role === 'user') {
    return <UserDashboard user={user} onLogout={onLogout} />;
  }

  return <Navigate to="/" replace />;
}

function AppContent() {
  const [user, setUser] = useState<{ id: string; name: string; role: 'admin' | 'user' } | null>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  // Set loading to false for non-name routes
  useEffect(() => {
    const pathParts = location.pathname.split('/').filter(Boolean);
    const knownRoutes = ['admin', 'user', 'workout', 'exercise'];
    
    // Only handle loading for non-name routes
    if (pathParts.length === 0 || knownRoutes.includes(pathParts[0])) {
      setLoading(false);
    }
    // Name routes handle their own loading
  }, [location.pathname]);

  const handleLogout = () => {
    setUser(null);
    // Navigate to home
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-black">
      <Routes>
        <Route path="/" element={
          loading ? (
            <div className="min-h-screen bg-black flex items-center justify-center">
              <div className="text-white">Loading...</div>
            </div>
          ) : user ? (
            user.role === 'admin' ? <Navigate to="/admin" /> : <Navigate to={`/${slugifyName(user.name)}`} />
          ) : (
            <LoginScreen onLogin={(user) => {
              setUser(user);
              if (user.role === 'user') {
                window.location.href = `/${slugifyName(user.name)}`;
              }
            }} />
          )
        } />
        <Route path="/admin/*" element={
          user?.role === 'admin' ? <AdminDashboard user={user} onLogout={handleLogout} /> : <Navigate to="/" />
        } />
        <Route path="/workout/:workoutId" element={
          user ? <WorkoutViewer userId={user.id} onBack={() => window.history.back()} /> : <Navigate to="/" />
        } />
        <Route path="/exercise/:workoutId/:exerciseName" element={
          user ? <ExerciseDetail userId={user.id} onBack={() => window.history.back()} /> : <Navigate to="/" />
        } />
        <Route path="/user" element={
          user?.role === 'user' ? <UserDashboard user={user} onLogout={handleLogout} /> : <Navigate to="/" />
        } />
        <Route path="/:name" element={<NameRoute onSetUser={setUser} onLogout={handleLogout} />} />
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