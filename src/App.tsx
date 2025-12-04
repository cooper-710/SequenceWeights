import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AdminDashboard } from './components/AdminDashboard';
import { UserDashboard } from './components/UserDashboard';
import { WorkoutViewer } from './components/WorkoutViewer';
import { ExerciseDetail } from './components/ExerciseDetail';
import { LoginScreen } from './components/LoginScreen';

export default function App() {
  const [user, setUser] = useState<{ id: string; name: string; role: 'admin' | 'user'; token?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  // Check for saved session on mount
  useEffect(() => {
    // Check if there's a token in the URL first
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    // If token is in URL, clear localStorage and let LoginScreen handle it
    if (token) {
      localStorage.removeItem('user'); // Clear any existing session
      setLoading(false);
      return;
    }

    // No token - check for saved session
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        // If user has token, validate it; otherwise use saved user (admin)
        if (parsedUser.token) {
          fetch(`/api/auth/validate/${parsedUser.token}`)
            .then(res => {
              if (res.ok) {
                return res.json();
              }
              throw new Error('Invalid token');
            })
            .then(data => {
              setUser({ ...data.user, token: parsedUser.token });
            })
            .catch(() => {
              localStorage.removeItem('user');
            })
            .finally(() => setLoading(false));
        } else {
          setUser(parsedUser);
          setLoading(false);
        }
      } catch (err) {
        localStorage.removeItem('user');
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-black">
        <Routes>
          <Route path="/" element={
            user ? (
              user.role === 'admin' ? <Navigate to="/admin" /> : <Navigate to="/user" />
            ) : (
              <LoginScreen onLogin={(user) => {
                setUser(user);
                localStorage.setItem('user', JSON.stringify(user));
              }} />
            )
          } />
          <Route path="/admin/*" element={
            user?.role === 'admin' ? <AdminDashboard user={user} onLogout={handleLogout} /> : <Navigate to="/" />
          } />
          <Route path="/user" element={
            user?.role === 'user' ? <UserDashboard user={user} onLogout={handleLogout} /> : <Navigate to="/" />
          } />
          <Route path="/workout/:workoutId" element={
            user ? <WorkoutViewer userId={user.id} onBack={() => window.history.back()} /> : <Navigate to="/" />
          } />
          <Route path="/exercise/:workoutId/:exerciseName" element={
            user ? <ExerciseDetail onBack={() => window.history.back()} /> : <Navigate to="/" />
          } />
        </Routes>
      </div>
    </BrowserRouter>
  );
}