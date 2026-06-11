import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { LogIn, KeyRound, Mail, AlertCircle } from 'lucide-react';

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const response = await axios.post('/api/auth/login', { email, password });
      const { token, ...userData } = response.data;
      login(userData, token);
      navigate('/');
    } catch (err: any) {
      setError(
        err.response?.data?.message || 
        'Could not connect to the server. Make sure the backend is running.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickLogin = async (emailVal: string, passVal: string) => {
    setError(null);
    setSubmitting(true);
    setEmail(emailVal);
    setPassword(passVal);

    try {
      const response = await axios.post('/api/auth/login', { email: emailVal, password: passVal });
      const { token, ...userData } = response.data;
      login(userData, token);
      navigate('/');
    } catch (err: any) {
      setError(
        err.response?.data?.message || 
        'Could not connect to the server. Make sure the backend is running.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-tr from-slate-900 via-slate-950 to-dairy-950 px-4">
      {/* Decorative Blur Backgrounds */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-dairy-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl" />

      <div className="w-full max-w-md bg-white/10 dark:bg-slate-900/60 backdrop-blur-xl border border-white/10 dark:border-slate-800 p-8 rounded-3xl shadow-2xl relative">
        <div className="text-center mb-8">
          <img src="/logo.png" alt="Pitambara Dairy Logo" className="w-20 h-20 mx-auto mb-4 object-contain bg-white rounded-full p-1 animate-pulse" />
          <h2 className="text-3xl font-extrabold tracking-tight text-white font-sans">
            PITAMBARA <span className="text-dairy-400">DAIRY</span>
          </h2>
          <p className="text-slate-400 text-sm mt-1">DMS Enterprise Resource Portal</p>
        </div>

        {error && (
          <div className="mb-6 flex items-start p-4 bg-red-950/40 border border-red-500/30 text-red-300 rounded-2xl text-sm leading-relaxed">
            <AlertCircle className="w-5 h-5 mr-3 shrink-0 text-red-400" />
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
              Email Address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400 pointer-events-none">
                <Mail className="w-5 h-5" />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@pitambara.com"
                className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 focus:border-dairy-500 focus:bg-slate-900 rounded-2xl text-white outline-none transition-all placeholder:text-slate-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400 pointer-events-none">
                <KeyRound className="w-5 h-5" />
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 focus:border-dairy-500 focus:bg-slate-900 rounded-2xl text-white outline-none transition-all placeholder:text-slate-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 bg-dairy-500 hover:bg-dairy-600 disabled:opacity-50 text-white font-semibold rounded-2xl shadow-lg shadow-dairy-500/20 hover:shadow-dairy-600/30 flex items-center justify-center transition-all duration-150"
          >
            {submitting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <LogIn className="w-5 h-5 mr-2" />
                Sign In
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-white/5 pt-6">
          <p className="text-xs font-semibold text-slate-400 mb-3">Quick Auto-Login Options:</p>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleQuickLogin('admin@pitambara.com', 'admin123')}
              className="py-2.5 bg-white/5 hover:bg-dairy-500/20 hover:border-dairy-500/50 border border-white/10 rounded-xl text-white font-bold text-xs transition-all duration-150"
            >
              👑 Admin
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('manager@pitambara.com', 'manager123')}
              className="py-2.5 bg-white/5 hover:bg-teal-500/20 hover:border-teal-500/50 border border-white/10 rounded-xl text-white font-bold text-xs transition-all duration-150"
            >
              💼 Manager
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('staff@pitambara.com', 'staff123')}
              className="py-2.5 bg-white/5 hover:bg-blue-500/20 hover:border-blue-500/50 border border-white/10 rounded-xl text-white font-bold text-xs transition-all duration-150"
            >
              🛠️ Staff
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
