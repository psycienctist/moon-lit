import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api';
import PostCard from '../components/PostCard';
import ComposePost from '../components/ComposePost';
import { useAuth } from '../lib/auth';

export default function BoardView() {
  const { slug } = useParams();
  const { user } = useAuth();
  const [board, setBoard] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [bRes, pRes] = await Promise.all([
        api.get('/boards'),
        api.get('/posts', { params: { board_slug: slug } }),
      ]);
      setBoard(bRes.data.find((b) => b.slug === slug));
      setPosts(pRes.data);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [slug]);

  const onCreated = (p) => setPosts((prev) => [p, ...prev]);
  const onChange = (p) => setPosts((prev) => prev.map((x) => (x.id === p.id ? p : x)));
  const onDelete = (id) => setPosts((prev) => prev.filter((x) => x.id !== id));

  if (loading) return <div className="text-center text-cosmos-mist py-12">Loading…</div>;
  if (!board) return (
    <div className="max-w-3xl mx-auto px-4 py-10 text-center">
      <div className="text-5xl mb-3">🌫️</div>
      <p className="text-cosmos-glow display">Board not found.</p>
      <Link to="/boards" className="ghost-button mt-4 inline-block">← Back to boards</Link>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
      <Link to="/boards" className="text-sm text-cosmos-mist hover:text-cosmos-purple" data-testid="back-to-boards">← All boards</Link>
      <div className="cosmic-card p-6 mt-3 mb-6 bg-vibe-card border-cosmos-purple/40">
        <div className="flex items-center gap-4">
          <div className="text-5xl">{board.icon}</div>
          <div>
            <h1 className="display text-2xl sm:text-3xl font-black text-cosmos-glow">{board.name}</h1>
            <p className="text-cosmos-mist text-sm mt-1">{board.description}</p>
          </div>
        </div>
      </div>

      {user && <div className="mb-6"><ComposePost boards={[board]} defaultBoard={slug} onCreated={onCreated} /></div>}

      {posts.length === 0 ? (
        <div className="cosmic-card p-8 text-center">
          <div className="text-4xl mb-2">🌑</div>
          <div className="text-cosmos-mist">No transmissions on this board yet.</div>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((p) => <PostCard key={p.id} post={p} onChange={onChange} onDelete={onDelete} />)}
        </div>
      )}
    </div>
  );
}
