import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Link } from 'react-router-dom';

export default function Boards() {
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    api.get('/boards').then((r) => setBoards(r.data)).finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
      <div className="mb-8">
        <div className="label-mono text-cosmos-purple">Message Boards</div>
        <h1 className="display text-3xl font-black text-cosmos-glow mt-1">CATEGORIZED CONSTELLATIONS</h1>
        <p className="text-cosmos-mist text-sm mt-1">Pick a constellation. Drop your transmission.</p>
      </div>
      {loading ? (
        <div className="text-center text-cosmos-mist py-12">Mapping the boards…</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" data-testid="boards-grid">
          {boards.map((b) => (
            <Link
              key={b.slug}
              to={`/boards/${b.slug}`}
              className="cosmic-card p-5 group hover:border-cosmos-purple hover:shadow-glow transition-all"
              data-testid={`board-card-${b.slug}`}
            >
              <div className="flex items-start gap-4">
                <div className="text-4xl group-hover:scale-110 transition-transform">{b.icon}</div>
                <div className="flex-1">
                  <div className="display text-xl font-bold text-cosmos-glow group-hover:text-cosmos-purple">{b.name}</div>
                  <p className="text-sm text-cosmos-mist mt-1">{b.description}</p>
                  <div className="label-mono text-cosmos-blue mt-3">{b.post_count} {b.post_count === 1 ? 'post' : 'posts'}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
