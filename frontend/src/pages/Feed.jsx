import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import PostCard from '../components/PostCard';
import ComposePost from '../components/ComposePost';
import ShareCosmicModal from '../components/ShareCosmicModal';
import LunarBrief from '../components/LunarBrief';
import { useAuth } from '../lib/auth';
import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';

export default function Feed() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [shareOpen, setShareOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [pRes, bRes] = await Promise.all([api.get('/posts'), api.get('/boards')]);
      setPosts(pRes.data);
      setBoards(bRes.data);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const onCreated = (p) => setPosts((prev) => [p, ...prev]);
  const onChange = (p) => setPosts((prev) => prev.map((x) => (x.id === p.id ? p : x)));
  const onDelete = (id) => setPosts((prev) => prev.filter((x) => x.id !== id));

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <div className="label-mono text-cosmos-purple">Single Feed</div>
          <h1 className="display text-3xl font-black text-cosmos-glow mt-1">THE COSMIC TIMELINE</h1>
          <p className="text-cosmos-mist text-sm mt-1">Every voice across every board, in chronological orbit.</p>
        </div>
        <Link to="/boards" className="ghost-button hidden sm:inline-block" data-testid="feed-to-boards">All boards →</Link>
      </div>

      {user && <LunarBrief />}

      {user ? (
        <div className="mb-6 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="label-mono text-cosmos-mist">Share something</div>
            <button
              onClick={() => setShareOpen(true)}
              className="ghost-button inline-flex items-center gap-2"
              data-testid="open-cosmic-share-btn"
            >
              <Sparkles className="w-4 h-4" /> Share my Cosmic Card
            </button>
          </div>
          <ComposePost boards={boards} onCreated={onCreated} />
        </div>
      ) : (
        <div className="cosmic-card p-5 mb-6 text-center">
          <p className="text-cosmos-mist">
            <Link to="/login" className="text-cosmos-purple hover:underline">Log in</Link>
            {' '}or{' '}
            <Link to="/register" className="text-cosmos-purple hover:underline">join</Link>
            {' '}to post, react, and chat.
          </p>
        </div>
      )}

      {shareOpen && (
        <ShareCosmicModal
          boards={boards}
          onClose={() => setShareOpen(false)}
          onShared={(p) => setPosts((prev) => [p, ...prev])}
        />
      )}

      {loading ? (
        <div className="text-center text-cosmos-mist py-12">Aligning the stars…</div>
      ) : posts.length === 0 ? (
        <div className="cosmic-card p-8 text-center">
          <div className="text-5xl mb-2">🌑</div>
          <div className="display text-cosmos-glow">The void is quiet… for now.</div>
          <p className="text-cosmos-mist text-sm mt-1">Be the first to send a signal.</p>
        </div>
      ) : (
        <div className="space-y-4" data-testid="feed-posts">
          {posts.map((p) => (
            <PostCard key={p.id} post={p} onChange={onChange} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  );
}
