import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import Avatar from '../components/Avatar';
import CosmicCard from '../components/CosmicCard';
import TradeRequestModal from '../components/TradeRequestModal';
import { useAuth } from '../lib/auth';
import { UserX, UserCheck, Send, Heart, Users } from 'lucide-react';

const TWIN_TONE = {
  'Twin Soul': 'text-cosmos-gold border-cosmos-gold/50 bg-cosmos-gold/10',
  'Twin Moon': 'text-cosmos-purple border-cosmos-purple/50 bg-cosmos-violet/15',
  'Twin Sun': 'text-cosmos-blue border-cosmos-blue/50 bg-cosmos-blue/10',
};

export default function Profile() {
  const { username } = useParams();
  const { user, refresh } = useAuth();
  const nav = useNavigate();
  const [profile, setProfile] = useState(null);
  const [friends, setFriends] = useState([]);
  const [currentSky, setCurrentSky] = useState(null);
  const [tradeOpen, setTradeOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const loadProfile = async () => {
    try {
      const { data } = await api.get(`/users/${username}`);
      setProfile(data);
      const fr = await api.get('/friends', { params: { username } });
      setFriends(fr.data);
      if (user) {
        try {
          const sky = await api.get('/cosmic/me');
          setCurrentSky(sky.data.now);
        } catch {}
      }
    } catch {
      setProfile(false);
    }
  };

  useEffect(() => { loadProfile(); /* eslint-disable-next-line */ }, [username]);

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

  const acceptIncoming = async () => {
    if (!profile.incoming_trade_id) return;
    setBusy(true);
    try {
      await api.post(`/trades/${profile.incoming_trade_id}/accept`);
      await loadProfile();
    } finally { setBusy(false); }
  };

  const cardData = profile.natal ? { now: currentSky || {}, natal: profile.natal, rarity: profile.rarity } : null;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <div className="cosmic-card p-6 bg-vibe-card border-cosmos-purple/40">
        <div className="flex items-start gap-5 flex-wrap">
          <Avatar user={profile} size={88} />
          <div className="flex-1 min-w-[200px]">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="display text-2xl sm:text-3xl font-black text-cosmos-glow break-words">{profile.username}</h1>
              {profile.twin_with_viewer && (
                <span
                  className={`label-mono px-2 py-0.5 rounded-full border text-[0.6rem] ${TWIN_TONE[profile.twin_with_viewer]}`}
                  title="Cosmic kinship with you"
                  data-testid="twin-badge"
                >
                  {profile.twin_with_viewer === 'Twin Soul' && '✦ '}
                  {profile.twin_with_viewer === 'Twin Moon' && '☾ '}
                  {profile.twin_with_viewer === 'Twin Sun' && '☉ '}
                  {profile.twin_with_viewer}
                </span>
              )}
              {profile.rarity && (
                <span className="label-mono px-2 py-0.5 rounded-full border border-cosmos-purple/40 text-cosmos-purple bg-cosmos-violet/10 text-[0.6rem]" data-testid="profile-rarity">
                  {profile.rarity.tier}
                </span>
              )}
            </div>
            <div className="label-mono mt-1 text-cosmos-purple">{profile.role === 'admin' ? 'Constellation Keeper' : 'Cosmonaut'}</div>
            {profile.natal && (
              <div className="mt-2 text-cosmos-glow/90 text-sm">
                {profile.natal.sun_symbol} {profile.natal.sun_sign} Sun · {profile.natal.moon_symbol} {profile.natal.moon_sign} Moon · {profile.natal.birth_phase_emoji} {profile.natal.birth_phase_name}
              </div>
            )}
            {profile.bio && <p className="mt-3 text-cosmos-glow/90 whitespace-pre-wrap">{profile.bio}</p>}

            <div className="mt-4 flex flex-wrap gap-2">
              {isMe ? (
                <>
                  <Link to="/settings" className="ghost-button" data-testid="profile-edit-link">Edit profile</Link>
                  <Link to="/collection" className="ghost-button">My collection</Link>
                  <Link to="/trades" className="ghost-button">Trades</Link>
                </>
              ) : user ? (
                <>
                  {profile.trade_state === 'friend' && (
                    <span className="ghost-button !cursor-default inline-flex items-center gap-1 !text-emerald-300 !border-emerald-500/40" data-testid="profile-friend-state">
                      <Heart className="w-3.5 h-3.5" /> Cosmic friend
                    </span>
                  )}
                  {profile.trade_state === 'outgoing_pending' && (
                    <span className="ghost-button !cursor-default" data-testid="profile-pending-out">Card sent · awaiting</span>
                  )}
                  {profile.trade_state === 'incoming_pending' && (
                    <button onClick={acceptIncoming} disabled={busy} className="cosmic-button !text-xs inline-flex items-center gap-1" data-testid="profile-accept-incoming">
                      <UserCheck className="w-3.5 h-3.5" /> Accept their card
                    </button>
                  )}
                  {(profile.trade_state === 'none' || !profile.trade_state) && (
                    <button onClick={() => setTradeOpen(true)} className="cosmic-button inline-flex items-center gap-1" data-testid="profile-send-card-btn">
                      <Send className="w-4 h-4" /> Send my card
                    </button>
                  )}
                  <button onClick={toggleBlock} disabled={busy} className="ghost-button" data-testid="profile-block-btn">
                    {isBlocked ? <UserCheck className="w-4 h-4 mr-1 inline" /> : <UserX className="w-4 h-4 mr-1 inline" />}
                    {isBlocked ? 'Unblock' : 'Block'}
                  </button>
                </>
              ) : (
                <Link to="/login" className="cosmic-button">Log in to trade</Link>
              )}
            </div>

            <div className="mt-4 flex gap-6 text-sm">
              <Link to={isMe ? '/collection' : `/u/${profile.username}/collection`} className="text-cosmos-mist hover:text-cosmos-purple">
                <span className="display text-cosmos-glow text-lg font-bold mr-1">{profile.card_count || 0}</span> cards
              </Link>
              <div className="text-cosmos-mist">
                <span className="display text-cosmos-glow text-lg font-bold mr-1">{friends.length}</span> friends
              </div>
            </div>
          </div>
        </div>
      </div>

      {profile.natal && currentSky && (
        <div className="mt-5">
          <div className="label-mono text-cosmos-purple mb-2">The Card</div>
          <CosmicCard data={cardData} compact />
        </div>
      )}

      {friends.length > 0 && (
        <div className="mt-6">
          <div className="label-mono text-cosmos-mist mb-2 flex items-center gap-1">
            <Users className="w-3.5 h-3.5" /> Cosmic friends
          </div>
          <div className="flex flex-wrap gap-2">
            {friends.slice(0, 24).map((f) => (
              <Link key={f.id} to={`/u/${f.username}`} className="flex items-center gap-2 px-2 py-1 rounded-full bg-white/5 border border-white/10 hover:border-cosmos-purple/50">
                <Avatar user={f} size={20} />
                <span className="text-xs text-cosmos-glow">@{f.username}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {tradeOpen && (
        <TradeRequestModal
          targetUsername={profile.username}
          onClose={() => setTradeOpen(false)}
          onSent={() => loadProfile()}
        />
      )}
    </div>
  );
}
