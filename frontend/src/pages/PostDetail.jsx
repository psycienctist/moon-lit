import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { api, formatApiError } from '../lib/api';
import PostCard from '../components/PostCard';
import Avatar from '../components/Avatar';
import TimeAgo from '../components/TimeAgo';
import { useAuth } from '../lib/auth';
import { Trash2 } from 'lucide-react';

export default function PostDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const [pRes, cRes] = await Promise.all([
        api.get(`/posts/${id}`),
        api.get(`/posts/${id}/comments`),
      ]);
      setPost(pRes.data);
      setComments(cRes.data);
    } catch {
      setPost(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const submit = async (e) => {
    e.preventDefault();
    if (!user) { nav('/login'); return; }
    setBusy(true); setError('');
    try {
      const { data } = await api.post(`/posts/${id}/comments`, { content: content.trim() });
      setComments((prev) => [...prev, data]);
      setContent('');
      setPost((p) => p ? { ...p, comment_count: (p.comment_count || 0) + 1 } : p);
    } catch (e) {
      setError(formatApiError(e.response?.data?.detail));
    } finally { setBusy(false); }
  };

  const deleteComment = async (cid) => {
    // eslint-disable-next-line no-alert
    const ok = typeof window !== 'undefined' && window.confirm('Delete this comment?');
    if (!ok) return;
    await api.delete(`/comments/${cid}`);
    setComments((prev) => prev.filter((c) => c.id !== cid));
    setPost((p) => p ? { ...p, comment_count: Math.max(0, (p.comment_count || 1) - 1) } : p);
  };

  if (post === null) return <div className="text-center text-cosmos-mist py-12">Loading…</div>;
  if (post === false) return (
    <div className="max-w-3xl mx-auto px-4 py-10 text-center">
      <div className="text-5xl mb-3">🌒</div>
      <p className="text-cosmos-glow display">Post not found.</p>
      <Link to="/feed" className="ghost-button mt-4 inline-block">← Back to feed</Link>
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
      <Link to="/feed" className="text-sm text-cosmos-mist hover:text-cosmos-purple" data-testid="back-to-feed">← Feed</Link>
      <div className="mt-3">
        <PostCard post={post} onChange={(p) => setPost(p)} onDelete={() => nav('/feed')} />
      </div>

      <div className="mt-6">
        <div className="label-mono mb-3">{comments.length} {comments.length === 1 ? 'reply' : 'replies'}</div>

        {user ? (
          <form onSubmit={submit} className="cosmic-card p-4 mb-4" data-testid="comment-form">
            <textarea
              value={content} onChange={(e) => setContent(e.target.value)}
              placeholder="Add to the conversation…"
              required maxLength={2000} rows={3}
              className="cosmic-input resize-none"
              data-testid="comment-input"
            />
            <div className="flex items-center gap-2 mt-2">
              {error && <span className="text-cosmos-ember text-sm">{error}</span>}
              <button disabled={busy} className="cosmic-button ml-auto" data-testid="comment-submit">
                {busy ? 'Sending…' : 'Reply'}
              </button>
            </div>
          </form>
        ) : (
          <div className="cosmic-card p-4 mb-4 text-center text-cosmos-mist text-sm">
            <Link to="/login" className="text-cosmos-purple hover:underline">Log in</Link> to reply.
          </div>
        )}

        <div className="space-y-3" data-testid="comments-list">
          {comments.map((c) => (
            <div key={c.id} className="cosmic-card p-4" data-testid={`comment-${c.id}`}>
              <div className="flex items-start gap-3">
                <Avatar user={c.author} size={32} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs flex items-center gap-2">
                    <Link to={`/u/${c.author?.username}`} className="text-cosmos-glow font-semibold hover:text-cosmos-purple">
                      {c.author?.username}
                    </Link>
                    <TimeAgo iso={c.created_at} className="text-cosmos-mist" />
                  </div>
                  <div className="text-cosmos-glow/90 mt-1 whitespace-pre-wrap">{c.content}</div>
                </div>
                {user && (user.id === c.author?.id || user.role === 'admin') && (
                  <button
                    onClick={() => deleteComment(c.id)}
                    className="p-1.5 rounded hover:bg-cosmos-ember/20 text-cosmos-mist hover:text-cosmos-ember"
                    data-testid={`delete-comment-${c.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
