import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { formatApiError } from '../lib/api';
import { Sparkles } from 'lucide-react';

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      await register(email, password, username);
      nav('/feed');
    } catch (err) {
      setError(formatApiError(err.response?.data?.detail) || err.message);
    } finally { setLoading(false); }
  };

  return (
    <div className="max-w-md mx-auto mt-16 px-6">
      <div className="text-center mb-8 animate-fade-in">
        <Sparkles className="w-10 h-10 mx-auto text-cosmos-purple mb-3" />
        <h1 className="display text-3xl font-black tracking-[0.25em] text-cosmos-glow">ENTER THE ORBIT</h1>
        <p className="text-cosmos-mist text-sm mt-2">Claim your moniker among cosmonauts.</p>
      </div>
      <form onSubmit={submit} className="cosmic-card p-7 space-y-4 animate-slide-up shadow-glow">
        <div>
          <label className="label-mono block mb-2">Username</label>
          <input
            required minLength={3} maxLength={24}
            value={username} onChange={(e) => setUsername(e.target.value)}
            className="cosmic-input" data-testid="register-username-input"
            placeholder="moon_walker"
          />
        </div>
        <div>
          <label className="label-mono block mb-2">Email</label>
          <input
            type="email" required
            value={email} onChange={(e) => setEmail(e.target.value)}
            className="cosmic-input" data-testid="register-email-input"
          />
        </div>
        <div>
          <label className="label-mono block mb-2">Password</label>
          <input
            type="password" required minLength={6}
            value={password} onChange={(e) => setPassword(e.target.value)}
            className="cosmic-input" data-testid="register-password-input"
          />
        </div>
        {error && (
          <div className="text-sm text-cosmos-ember bg-cosmos-ember/10 border border-cosmos-ember/30 rounded-lg px-3 py-2" data-testid="register-error">
            {error}
          </div>
        )}
        <button type="submit" disabled={loading} className="cosmic-button w-full" data-testid="register-submit">
          {loading ? 'Charting your stars…' : 'Create account'}
        </button>
        <div className="text-center text-xs text-cosmos-mist pt-2">
          Already orbiting?{' '}
          <Link to="/login" className="text-cosmos-purple hover:underline" data-testid="register-to-login-link">Log in</Link>
        </div>
      </form>
    </div>
  );
}
