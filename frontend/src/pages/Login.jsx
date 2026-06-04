import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { formatApiError } from '../lib/api';
import { Moon } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await login(email, password);
      const next = new URLSearchParams(loc.search).get('next') || '/feed';
      nav(next);
    } catch (err) {
      setError(formatApiError(err.response?.data?.detail) || err.message);
    } finally { setLoading(false); }
  };

  return (
    <div className="max-w-md mx-auto mt-16 px-6">
      <div className="text-center mb-8 animate-fade-in">
        <Moon className="w-10 h-10 mx-auto text-cosmos-purple mb-3" />
        <h1 className="display text-3xl font-black tracking-[0.25em] text-cosmos-glow">RE-ENTER ORBIT</h1>
        <p className="text-cosmos-mist text-sm mt-2">Welcome back, moon child.</p>
      </div>
      <form onSubmit={submit} className="cosmic-card p-7 space-y-4 animate-slide-up shadow-glow">
        <div>
          <label className="label-mono block mb-2">Email</label>
          <input
            type="email" required
            value={email} onChange={(e) => setEmail(e.target.value)}
            className="cosmic-input" data-testid="login-email-input"
            autoComplete="email"
          />
        </div>
        <div>
          <label className="label-mono block mb-2">Password</label>
          <input
            type="password" required
            value={password} onChange={(e) => setPassword(e.target.value)}
            className="cosmic-input" data-testid="login-password-input"
            autoComplete="current-password"
          />
        </div>
        {error && (
          <div className="text-sm text-cosmos-ember bg-cosmos-ember/10 border border-cosmos-ember/30 rounded-lg px-3 py-2" data-testid="login-error">
            {error}
          </div>
        )}
        <button type="submit" disabled={loading} className="cosmic-button w-full" data-testid="login-submit">
          {loading ? 'Aligning…' : 'Enter the orbit'}
        </button>
        <div className="text-center text-xs text-cosmos-mist pt-2">
          New here?{' '}
          <Link to="/register" className="text-cosmos-purple hover:underline" data-testid="login-to-register-link">Create an account</Link>
        </div>
      </form>
    </div>
  );
}
