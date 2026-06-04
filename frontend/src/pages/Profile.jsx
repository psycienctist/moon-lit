import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api';
import Avatar from '../components/Avatar';
import { useAuth } from '../lib/auth';
import { UserX, UserCheck } from 'lucide-react';

export default function Profile() {
  const { username } = useParams();
  const { user, refresh } = useAuth();
  const [profile, setProfile] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get(`/users/${username}`).then((r) => setProfile(r.data)).catch(() => setProfile(false));
  }, [username]);

  if (profile === null) return <div className="text-center text-cosmos-mist py-12">Loading…</div>;
  if (profile === false) return (
    <div className="max-w-3xl mx-auto px-4 py-10 text-center">
      <div className="text-5xl mb-3">🌌</div>
      <p className="text-cosmos-glow display">Cosmonaut not found.</p>
    </div>
  );

  const isMe = user && user.username === profile.username;
  const isBlocked = user && (user.blocked_users || []).includes(profile.id);

  const toggleBlock = async () => {
    setBusy(true);
    try {
      if (isBlocked) await api.delete(`/users/${profile.username}/block`);
      else await api.post(`/users/${profile.username}/block`);
      await refresh();
    } finally { setBusy(false); }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
      <div className="cosmic-card p-7 bg-vibe-card border-cosmos-purple/40">
        <div className="flex items-start gap-5">
          <Avatar user={profile} size={88} />
          <div className="flex-1 min-w-0">
            <h1 className="display text-2xl sm:text-3xl font-black text-cosmos-glow break-words">{profile.username}</h1>
            <div className="label-mono mt-1 text-cosmos-purple">{profile.role === 'admin' ? 'Constellation Keeper' : 'Cosmonaut'}</div>
            {profile.bio && <p className="mt-3 text-cosmos-glow/90 whitespace-pre-wrap">{profile.bio}</p>}
            <div className="mt-4 flex gap-2">
              {isMe ? (
                <Link to="/settings" className="ghost-button" data-testid="profile-edit-link">Edit profile</Link>
              ) : user ? (
                <button onClick={toggleBlock} disabled={busy} className="ghost-button" data-testid="profile-block-btn">
                  {isBlocked ? <UserCheck className="w-4 h-4 mr-1 inline" /> : <UserX className="w-4 h-4 mr-1 inline" />}
                  {isBlocked ? 'Unblock' : 'Block'}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
