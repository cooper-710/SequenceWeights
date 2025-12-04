import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import sequenceLogo from 'figma:asset/5c2d0c8af8dfc8338b2c35795df688d7811f7b51.png';
import { ImageWithFallback } from './figma/ImageWithFallback';

interface LoginScreenProps {
  onLogin: (user: { id: string; name: string; role: 'admin' | 'user'; token?: string }) => void;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Check for token in URL and auto-login
  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      handleTokenLogin(token);
    }
  }, [searchParams]);

  const handleTokenLogin = async (token: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        throw new Error('Invalid login token');
      }

      const data = await response.json();
      const user = {
        ...data.user,
        token, // Store token for session persistence
      };
      
      // Save to localStorage for session persistence
      localStorage.setItem('user', JSON.stringify(user));
      
      // Clear token from URL
      navigate('/user', { replace: true });
      
      onLogin(user);
    } catch (err: any) {
      setError(err.message || 'Failed to login with token');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Mock login logic for admin
    if (email.includes('admin')) {
      const adminUser = { id: '1', name: 'Admin User', role: 'admin' as const };
      localStorage.setItem('user', JSON.stringify(adminUser));
      onLogin(adminUser);
    } else {
      setError('Please use your login link provided by your coach');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-black">
      <div className="w-full max-w-md">
        <div className="text-center mb-16">
          <ImageWithFallback 
            src={sequenceLogo} 
            alt="Sequence" 
            className="w-48 h-48 mx-auto mb-8 object-contain drop-shadow-[0_0_80px_rgba(245,110,15,0.3)] drop-shadow-[0_20px_60px_rgba(0,0,0,0.8)]" 
          />
          <h1 className="text-white text-5xl mb-3 tracking-wide bg-gradient-to-r from-white via-gray-100 to-white bg-clip-text text-transparent drop-shadow-[0_2px_10px_rgba(255,255,255,0.1)]">
            SEQUENCE
          </h1>
          <div className="flex items-center justify-center gap-3 text-gray-400">
            <span className="text-sm tracking-wider">Biomechanics</span>
            <div className="w-1 h-1 rounded-full bg-[#F56E0F]"></div>
            <span className="text-sm tracking-wider">Performance</span>
            <div className="w-1 h-1 rounded-full bg-[#F56E0F]"></div>
            <span className="text-sm tracking-wider">Lab</span>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-[#878787] mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#1B1B1E] border border-[#262626] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#F56E0F]"
              placeholder="Enter your email"
              required
            />
          </div>

          <div>
            <label className="block text-[#878787] mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#1B1B1E] border border-[#262626] rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#F56E0F]"
              placeholder="Enter your password"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full bg-[#F56E0F] hover:bg-[#e05d00] text-white py-3 rounded-lg transition-colors"
          >
            Sign In
          </button>

          {error && (
            <div className="bg-red-500/10 border border-red-500 rounded-lg p-3 text-red-400 text-sm">
              {error}
            </div>
          )}
          
          {loading && (
            <div className="text-center text-white">
              Logging in...
            </div>
          )}

          <p className="text-center text-sm text-[#878787] mt-4">
            Demo: Use "admin@sequence.com" for admin. Athletes should use their login link.
          </p>
        </form>
      </div>
    </div>
  );
}