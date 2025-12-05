import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useSearchParams, useLocation } from 'react-router-dom';
import { AdminDashboard } from './components/AdminDashboard';
import { UserDashboard } from './components/UserDashboard';
import { WorkoutViewer } from './components/WorkoutViewer';
import { ExerciseDetail } from './components/ExerciseDetail';
import { LoginScreen } from './components/LoginScreen';

function AppContent() {
  const [user, setUser] = useState<{ id: string; name: string; role: 'admin' | 'user'; token?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const location = useLocation();

  // Validate token from URL on every mount and route change
  useEffect(() => {
    const token = searchParams.get('token');
    
    if (token) {
      // Validate token from URL
      fetch(`/api/auth/login?token=${token}`)
        .then(res => {
          if (res.ok) {
            return res.json();
          }
          throw new Error('Invalid token');
        })
        .then(data => {
          setUser({ ...data.user, token });
        })
        .catch(() => {
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      // No token - user must be admin or not logged in
      setLoading(false);
    }
  }, [searchParams, location.pathname]);

  const handleLogout = () => {
    setUser(null);
    // Navigate to home without token
    window.location.href = '/';
  };

  // Helper to preserve token in navigation
  const preserveToken = (path: string) => {
    const token = searchParams.get('token');
    return token ? `${path}?token=${token}` : path;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <Routes>
        <Route path="/" element={
          user ? (
            user.role === 'admin' ? <Navigate to="/admin" /> : <Navigate to={preserveToken('/user')} />
          ) : (
            <LoginScreen onLogin={(user) => {
              setUser(user);
            }} />
          )
        } />
        <Route path="/admin/*" element={
          user?.role === 'admin' ? <AdminDashboard user={user} onLogout={handleLogout} /> : <Navigate to="/" />
        } />
        <Route path="/user" element={
          user?.role === 'user' ? <UserDashboard user={user} onLogout={handleLogout} /> : <Navigate to={preserveToken('/')} />
        } />
        <Route path="/workout/:workoutId" element={
          user ? <WorkoutViewer userId={user.id} onBack={() => window.history.back()} /> : <Navigate to={preserveToken('/')} />
        } />
        <Route path="/exercise/:workoutId/:exerciseName" element={
          user ? <ExerciseDetail onBack={() => window.history.back()} /> : <Navigate to={preserveToken('/')} />
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