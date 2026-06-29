import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import CosmicCard from '../components/CosmicCard';
import Avatar from '../components/Avatar';
import TimeAgo from '../components/TimeAgo';
import { Inbox, Send, Check, X } from 'lucide-react';

export default function Trades() {
  const { user } = useAuth();
  const [tab, setTab] = useState('incoming');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await api.get('/trades', { params: { direction: tab } });
      setItems(data);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [tab, user]);

  const accept = async (id) => {
    await api.post(`/trades/${id}/accept`);
    load();
  };
  const decline = async (id) => {
    await api.post(`/trades/${id}/decline`);
    load();
  };
  const cancel = async (id) => {
    await api.delete(`/trades/${id}`);
    load();
  };

  if (!user) return (
    <div className="text-center text-cosmos-mist py-12">
      <Link to="/login" className="text-cosmos-purple hover:underline">Log in</Link> to view your trades.
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
      <div className="mb-6">
        <div className="label-mono text-cosmos-purple">Card Trades</div>
        <h1 className="display text-3xl font-black text-cosmos-glow mt-1">EXCHANGE WITH COSMONAUTS</h1>
        <p className="text-cosmos-mist text-sm mt-1">Sending your card is the way to make new friends in Lunatick.</p>
      </div>

      <div className="flex gap-2 mb-5">
        <button
          onClick={() => setTab('incoming')}
          className={`px-4 py-2 rounded-full text-sm border ${tab === 'incoming' ? 'bg-cosmos-violet/30 border-cosmos-purple text-cosmos-glow' : 'border-white/10 text-cosmos-mist hover:text-cosmos-glow'}`}
          data-testid="trades-tab-incoming"
        >
          <Inbox className="w-4 h-4 inline mr-1" /> Incoming
        </button>
        <button
          onClick={() => setTab('outgoing')}
          className={`px-4 py-2 rounded-full text-sm border ${tab === 'outgoing' ? 'bg-cosmos-violet/30 border-cosmos-purple text-cosmos-glow' : 'border-white/10 text-cosmos-mist hover:text-cosmos-glow'}`}
          data-testid="trades-tab-outgoing"
        >
          <Send className="w-4 h-4 inline mr-1" /> Outgoing
        </button>
      </div>

      {loading ? (
        <div className="text-center text-cosmos-mist py-12">Loading…</div>
      ) : items.length === 0 ? (
        <div className="cosmic-card p-8 text-center">
          <div className="text-4xl mb-2">📨</div>
          <div className="display text-cosmos-glow">No {tab} trades.</div>
          <p className="text-cosmos-mist text-sm mt-1">
            {tab === 'incoming'
              ? 'When someone sends you a card, it shows up here.'
              : 'Visit a profile and send your card to start a trade.'}
          </p>
        </div>
      ) : (
        <div className="space-y-5" data-testid="trades-list">
          {items.map((t) => {
            const other = t.perspective === 'received' ? t.from : t.to;
            const showCard = t.perspective === 'received' ? t.sender_card : t.sender_card; // sender's card is always visible
            return (
              <div key={t.id} className="cosmic-card p-4" data-testid={`trade-${t.id}`}>
                <div className="flex items-start gap-3">
                  <Avatar user={other} size={40} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Link to={`/u/${other.username}`} className="text-cosmos-glow font-semibold hover:text-cosmos-purple">
                        {other.username}
                      </Link>
                      <span className="text-xs text-cosmos-mist">·</span>
                      <TimeAgo iso={t.created_at} className="text-xs text-cosmos-mist" />
                      <span className={`label-mono ml-2 px-2 py-0.5 rounded-full border text-[0.55rem] ${
                        t.status === 'pending' ? 'border-cosmos-blue/50 text-cosmos-blue' :
                        t.status === 'accepted' ? 'border-emerald-500/50 text-emerald-300' :
                        'border-cosmos-ember/50 text-cosmos-ember'
                      }`}>
                        {t.status}
                      </span>
                    </div>
                    {t.message && (
                      <div className="mt-1 text-cosmos-glow/90 italic text-sm">"{t.message}"</div>
                    )}
                  </div>
                </div>

                {showCard && (
                  <div className="mt-3">
                    <CosmicCard data={showCard} compact />
                  </div>
                )}

                <div className="mt-3 flex flex-wrap gap-2">
                  {t.status === 'pending' && t.perspective === 'received' && (
                    <>
                      <button onClick={() => accept(t.id)} className="cosmic-button !py-1.5 !text-xs inline-flex items-center gap-1" data-testid={`trade-accept-${t.id}`}>
                        <Check className="w-3.5 h-3.5" /> Accept & trade
                      </button>
                      <button onClick={() => decline(t.id)} className="ghost-button !py-1.5 !text-xs inline-flex items-center gap-1" data-testid={`trade-decline-${t.id}`}>
                        <X className="w-3.5 h-3.5" /> Decline
                      </button>
                    </>
                  )}
                  {t.status === 'pending' && t.perspective === 'sent' && (
                    <button onClick={() => cancel(t.id)} className="ghost-button !py-1.5 !text-xs" data-testid={`trade-cancel-${t.id}`}>
                      Cancel request
                    </button>
                  )}
                  {t.status === 'accepted' && (
                    <Link to="/collection" className="ghost-button !py-1.5 !text-xs">See your collection →</Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
