import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import Avatar from './Avatar';
import { Compass, Sparkles } from 'lucide-react';

const TWIN_LABEL = {
  'Twin Soul': { tone: 'text-cosmos-gold', desc: 'Same Sun AND Moon — extremely rare.' },
  'Twin Moon': { tone: 'text-cosmos-purple', desc: 'You share a Moon sign.' },
  'Twin Sun': { tone: 'text-cosmos-blue', desc: 'You share a Sun sign.' },
};

export default function LunarBrief() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    api.get('/lunar-brief').then((r) => setData(r.data)).finally(() => setLoading(false));
  }, [user]);

  if (!user) return null;
  if (loading) return null;
  if (!data) return null;

  return (
    <div className="cosmic-card p-5 mb-5" data-testid="lunar-brief">
      <div className="flex items-center gap-2 mb-3">
        <Compass className="w-5 h-5 text-cosmos-purple" />
        <h2 className="display text-lg font-bold text-cosmos-glow">YOUR LUNAR BRIEF</h2>
      </div>

      {data.needs_birthdate ? (
        <div className="text-sm text-cosmos-mist">
          Add your birth date in{' '}
          <Link to="/settings" className="text-cosmos-purple hover:underline">profile settings</Link>
          {' '}to unlock Twin Moons and personalised cosmic kindred.
        </div>
      ) : (
        <>
          {data.twin_moons && data.twin_moons.length > 0 ? (
            <div className="mb-3">
              <div className="label-mono text-cosmos-mist mb-2">Cosmic kindred</div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {data.twin_moons.slice(0, 6).map((t) => {
                  const cfg = TWIN_LABEL[t.twin_kind] || TWIN_LABEL['Twin Moon'];
                  return (
                    <Link
                      key={t.id}
                      to={`/u/${t.username}`}
                      className="flex-shrink-0 w-32 cosmic-card p-3 text-center hover:border-cosmos-purple/60 group"
                      title={cfg.desc}
                      data-testid={`twin-card-${t.username}`}
                    >
                      <div className="flex justify-center mb-1.5">
                        <Avatar user={t} size={40} />
                      </div>
                      <div className="text-xs text-cosmos-glow font-semibold truncate group-hover:text-cosmos-purple">@{t.username}</div>
                      <div className={`label-mono mt-1 ${cfg.tone}`}>
                        {t.twin_kind === 'Twin Soul' && '✦ '}
                        {t.twin_kind === 'Twin Moon' && '☾ '}
                        {t.twin_kind === 'Twin Sun' && '☉ '}
                        {t.twin_kind}
                      </div>
                      <div className="text-[0.6rem] text-cosmos-mist mt-1">
                        {t.sun_symbol} {t.sun_sign} · {t.moon_symbol} {t.moon_sign}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-sm text-cosmos-mist mb-3">
              No twin moons found yet — invite friends or be the first of your sign.
            </div>
          )}

          {data.kindred_cards && data.kindred_cards.length > 0 && (
            <div>
              <div className="label-mono text-cosmos-mist mb-2 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Top cards from kindred cosmonauts
              </div>
              <div className="space-y-1.5">
                {data.kindred_cards.map((p) => (
                  <Link
                    key={p.id}
                    to={`/post/${p.id}`}
                    className="block px-3 py-2 rounded-lg bg-black/30 border border-white/5 hover:border-cosmos-purple/40 group"
                  >
                    <div className="text-sm text-cosmos-glow group-hover:text-cosmos-purple truncate">{p.title}</div>
                    <div className="text-xs text-cosmos-mist">@{p.author.username}</div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
