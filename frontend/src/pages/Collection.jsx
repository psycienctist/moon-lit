import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import CosmicCard from '../components/CosmicCard';
import Avatar from '../components/Avatar';
import TimeAgo from '../components/TimeAgo';

export default function Collection() {
  const { user } = useAuth();
  const { username } = useParams();
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ownerName, setOwnerName] = useState(username || user?.username);

  const isOwn = !username || username === user?.username;

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/collection', { params: username ? { username } : {} });
      setCards(data);
      setOwnerName(username || user?.username);
    } finally { setLoading(false); }
  };

  useEffect(() => { if (user || username) load(); /* eslint-disable-next-line */ }, [username, user]);

  if (!user && !username) return (
    <div className="text-center text-cosmos-mist py-12">
      <Link to="/login" className="text-cosmos-purple hover:underline">Log in</Link> to view your collection.
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
      <div className="mb-6 flex items-end justify-between gap-3">
        <div>
          <div className="label-mono text-cosmos-purple">Collection</div>
          <h1 className="display text-3xl font-black text-cosmos-glow mt-1">
            {isOwn ? 'YOUR COSMIC DECK' : `@${ownerName}'S DECK`}
          </h1>
          <p className="text-cosmos-mist text-sm mt-1">
            {isOwn ? 'Cards collected through accepted trades.' : 'Cards this cosmonaut has collected.'}
          </p>
        </div>
        <Link to="/trades" className="ghost-button hidden sm:inline-block">Manage trades →</Link>
      </div>

      {loading ? (
        <div className="text-center text-cosmos-mist py-12">Loading deck…</div>
      ) : cards.length === 0 ? (
        <div className="cosmic-card p-8 text-center">
          <div className="text-5xl mb-2">🎴</div>
          <div className="display text-cosmos-glow">No cards yet.</div>
          <p className="text-cosmos-mist text-sm mt-1">
            {isOwn ? 'Send your card to another cosmonaut — when they accept, you both gain each other\'s card here.' : 'This cosmonaut hasn\'t traded any cards yet.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5" data-testid="collection-grid">
          {cards.map((c) => (
            <div key={c.trade_id} className="space-y-2" data-testid={`collection-card-${c.trade_id}`}>
              <div className="flex items-center gap-2 px-1">
                <Avatar user={c.from} size={28} />
                <Link to={`/u/${c.from.username}`} className="text-cosmos-glow text-sm font-semibold hover:text-cosmos-purple">
                  @{c.from.username}
                </Link>
                <span className="text-xs text-cosmos-mist">·</span>
                <span className="text-xs text-cosmos-mist">acquired <TimeAgo iso={c.acquired_at} /></span>
              </div>
              <CosmicCard data={c.card} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
