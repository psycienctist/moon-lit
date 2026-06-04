import React, { useState } from 'react';
import { useAuth } from '../lib/auth';
import { api, formatApiError } from '../lib/api';
import Avatar from '../components/Avatar';
import { useNavigate } from 'react-router-dom';

export default function Settings() {
  const { user, setUserData } = useAuth();
  const nav = useNavigate();
  const [username, setUsername] = useState(user?.username || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
  const [error, setError] = useState('');
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!user) { nav('/login'); return null; }

  const submit = async (e) => {
    e.preventDefault(); setError(''); setOk(false); setBusy(true);
    try {
      const { data } = await api.put('/users/me', {
        username: username.trim(),
        bio,
        avatar_url: avatarUrl.trim() || null,
      });
      setUserData(data);
      setOk(true);
    } catch (e) {
      setError(formatApiError(e.response?.data?.detail));
    } finally { setBusy(false); }
  };

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="display text-2xl font-black text-cosmos-glow mb-1">EDIT PROFILE</h1>
      <p className="text-cosmos-mist text-sm mb-6">Tune your cosmic signature.</p>
      <form onSubmit={submit} className="cosmic-card p-6 space-y-4">
        <div className="flex items-center gap-4">
          <Avatar user={{ username, avatar_url: avatarUrl }} size={64} />
          <div className="flex-1">
            <label className="label-mono block mb-2">Avatar URL</label>
            <input
              value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://… (leave blank for cosmic monogram)"
              className="cosmic-input"
              data-testid="settings-avatar-input"
            />
          </div>
        </div>
        <div>
          <label className="label-mono block mb-2">Username</label>
          <input
            value={username} onChange={(e) => setUsername(e.target.value)}
            required minLength={3} maxLength={24}
            className="cosmic-input"
            data-testid="settings-username-input"
          />
        </div>
        <div>
          <label className="label-mono block mb-2">Bio</label>
          <textarea
            value={bio} onChange={(e) => setBio(e.target.value)}
            maxLength={280} rows={3}
            className="cosmic-input resize-none"
            data-testid="settings-bio-input"
          />
        </div>
        {error && <div className="text-cosmos-ember text-sm">{error}</div>}
        {ok && <div className="text-emerald-400 text-sm">Saved. Your aura is updated.</div>}
        <button disabled={busy} className="cosmic-button" data-testid="settings-save">{busy ? 'Saving…' : 'Save'}</button>
      </form>
    </div>
  );
}
