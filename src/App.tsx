import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AdminDashboard } from './components/AdminDashboard';
import { UserDashboard } from './components/UserDashboard';
import { WorkoutViewer } from './components/WorkoutViewer';
import { ExerciseDetail } from './components/ExerciseDetail';
import { LoginScreen } from './components/LoginScreen';
import { slugifyName } from './utils/nameUtils';

function AppContent() {
  const [user, setUser] = useState<{ id: string; name: string; role: 'admin' | 'user' } | null>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  // Check for name in URL path and auto-login
  useEffect(() => {
    const pathParts = location.pathname.split('/').filter(Boolean);
    const knownRoutes = ['admin', 'user', 'workout', 'exercise'];
    
    // Check if we're on a user path (e.g., /john-doe)
    if (pathParts.length === 1 && !knownRoutes.includes(pathParts[0])) {
      const nameSlug = pathParts[0];
      
      // Check if we already have the correct user logged in
      if (user && user.role === 'user' && slugifyName(user.name) === nameSlug) {
        setLoading(false);
        return;
      }
      
      // Try to login with the name from the path
      handleNameLogin(nameSlug);
    } else if (pathParts[0] === 'admin') {
      // Admin route - skip authentication check, let admin route handle it
      setLoading(false);
    } else if (pathParts[0] === 'workout' || pathParts[0] === 'exercise') {
      // Protected routes - user should already be logged in
      setLoading(false);
    } else {
      // Root path or other routes - show login
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const handleNameLogin = async (nameSlug: string) => {
    setLoading(true);
    
    try {
      const response = await fetch(`/api/auth/by-name/${encodeURIComponent(nameSlug)}`);
      
      if (!response.ok) {
        throw new Error('Athlete not found');
      }

      const data = await response.json();
      setUser(data.user);
      
      // If we're not already on the name path, navigate to it
      const expectedPath = `/${nameSlug}`;
      if (location.pathname !== expectedPath) {
        window.history.replaceState(null, '', expectedPath);
      }
    } catch (err) {
      console.error('Failed to login:', err);
      setUser(null);
      // Redirect to home if login fails
      if (location.pathname !== '/') {
        window.location.href = '/';
        return;
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setUser(null);
    // Navigate to home
    window.location.href = '/';
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
          user ? <ExerciseDetail onBack={() => window.history.back()} /> : <Navigate to="/" />
        } />
        <Route path="/user" element={
          user?.role === 'user' ? <UserDashboard user={user} onLogout={handleLogout} /> : <Navigate to="/" />
        } />
        <Route path="/:name" element={
          user?.role === 'user' ? <UserDashboard user={user} onLogout={handleLogout} /> : <Navigate to="/" />
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