import React, { useState } from 'react';
import { api, formatApiError } from '../lib/api';
import Avatar from './Avatar';
import TimeAgo from './TimeAgo';
import { useAuth } from '../lib/auth';
import { Link, useNavigate } from 'react-router-dom';
import { MessageSquare, Flag, Trash2 } from 'lucide-react';

const REACTIONS = [
  { emoji: '🌕', label: 'Moon' },
  { emoji: '🔥', label: 'Fire' },
  { emoji: '✨', label: 'Sparkle' },
  { emoji: '🌀', label: 'Spiral' },
  { emoji: '💀', label: 'Skull' },
];

export default function PostCard({ post, onChange, onDelete, compact = false }) {
  const { user } = useAuth();
  const nav = useNavigate();
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [busy, setBusy] = useState(false);

  const react = async (emoji) => {
    if (!user) { nav('/login'); return; }
    try {
      const { data } = await api.post(`/posts/${post.id}/react`, { emoji });
      onChange && onChange(data);
    } catch (e) { /* ignore */ }
  };

  const remove = async () => {
    // eslint-disable-next-line no-alert
    const ok = typeof window !== 'undefined' && window.confirm('Delete this post?');
    if (!ok) return;
    setBusy(true);
    try {
      await api.delete(`/posts/${post.id}`);
      onDelete && onDelete(post.id);
    } finally { setBusy(false); }
  };

  const report = async () => {
    if (!reportReason.trim()) return;
    try {
      await api.post('/reports', { target_type: 'post', target_id: post.id, reason: reportReason.trim() });
      setReportOpen(false); setReportReason('');
      alert('Report submitted. Thank you for keeping the cosmos clean.');
    } catch (e) {
      alert(formatApiError(e.response?.data?.detail));
    }
  };

  const isOwn = user && post.author?.id === user.id;

  return (
    <div className="cosmic-card p-5 hover:border-cosmos-purple/50 transition-colors animate-slide-up" data-testid={`post-card-${post.id}`}>
      <div className="flex items-start gap-3">
        <Avatar user={post.author} size={40} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-xs">
            <Link to={`/u/${post.author?.username}`} className="text-cosmos-glow font-semibold hover:text-cosmos-purple" data-testid="post-author-link">
              {post.author?.username}
            </Link>
            <span className="text-cosmos-mist">·</span>
            <TimeAgo iso={post.created_at} className="text-cosmos-mist" />
            {post.board_slug && (
              <>
                <span className="text-cosmos-mist">·</span>
                <Link to={`/boards/${post.board_slug}`} className="label-mono text-cosmos-blue hover:text-cosmos-purple" data-testid="post-board-tag">
                  #{post.board_slug}
                </Link>
              </>
            )}
          </div>
          <Link to={`/post/${post.id}`} className="block mt-1">
            <h3 className="display text-lg sm:text-xl font-bold text-cosmos-glow leading-snug hover:text-cosmos-purple transition-colors" data-testid="post-title">
              {post.title}
            </h3>
          </Link>
          {!compact && (
            <p className="text-cosmos-glow/80 mt-2 leading-relaxed whitespace-pre-wrap line-clamp-5" data-testid="post-content">
              {post.content}
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center flex-wrap gap-2">
        {REACTIONS.map((r) => {
          const mine = (post.my_reactions || []).includes(r.emoji);
          const count = post.reactions?.[r.emoji] || 0;
          return (
            <button
              key={r.emoji}
              onClick={() => react(r.emoji)}
              className={`px-2.5 py-1 rounded-full border text-sm transition-all ${
                mine
                  ? 'bg-cosmos-violet/30 border-cosmos-purple text-cosmos-glow'
                  : 'border-white/10 hover:border-cosmos-purple/60 text-cosmos-mist hover:text-cosmos-glow'
              }`}
              data-testid={`reaction-${r.emoji}-${post.id}`}
              title={r.label}
            >
              <span className="mr-1">{r.emoji}</span>
              {count > 0 && <span className="text-xs">{count}</span>}
            </button>
          );
        })}
        <Link
          to={`/post/${post.id}`}
          className="ml-1 inline-flex items-center gap-1 text-sm text-cosmos-mist hover:text-cosmos-glow"
          data-testid="post-comments-link"
        >
          <MessageSquare className="w-4 h-4" />
          <span>{post.comment_count}</span>
        </Link>
        <div className="ml-auto flex items-center gap-1">
          {user && !isOwn && (
            <button
              onClick={() => setReportOpen((o) => !o)}
              className="p-1.5 rounded hover:bg-cosmos-ember/20 text-cosmos-mist hover:text-cosmos-ember"
              title="Report"
              data-testid={`report-btn-${post.id}`}
            >
              <Flag className="w-4 h-4" />
            </button>
          )}
          {isOwn && (
            <button
              onClick={remove}
              disabled={busy}
              className="p-1.5 rounded hover:bg-cosmos-ember/20 text-cosmos-mist hover:text-cosmos-ember"
              title="Delete"
              data-testid={`delete-post-${post.id}`}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {reportOpen && (
        <div className="mt-3 border-t border-cosmos-line pt-3 flex flex-col sm:flex-row gap-2">
          <input
            value={reportReason}
            onChange={(e) => setReportReason(e.target.value)}
            placeholder="Reason for reporting…"
            className="cosmic-input flex-1"
            data-testid={`report-reason-${post.id}`}
          />
          <button onClick={report} className="cosmic-button" data-testid={`report-submit-${post.id}`}>Submit</button>
        </div>
      )}
    </div>
  );
}
