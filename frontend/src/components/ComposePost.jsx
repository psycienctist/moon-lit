import React, { useState } from 'react';
import { api, formatApiError } from '../lib/api';
import { useNavigate } from 'react-router-dom';

export default function ComposePost({ boards = [], defaultBoard = null, onCreated }) {
  const nav = useNavigate();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [board, setBoard] = useState(defaultBoard || '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault(); setError(''); setBusy(true);
    try {
      const { data } = await api.post('/posts', {
        title: title.trim(),
        content: content.trim(),
        board_slug: board || null,
      });
      setTitle(''); setContent('');
      onCreated && onCreated(data);
    } catch (err) {
      setError(formatApiError(err.response?.data?.detail));
    } finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} className="cosmic-card p-5 space-y-3 shadow-glow" data-testid="compose-post-form">
      <div className="label-mono">Cast a thought into the void</div>
      <input
        value={title} onChange={(e) => setTitle(e.target.value)}
        placeholder="Title (e.g., 'My Wolf Moon ritual setup')"
        required maxLength={200}
        className="cosmic-input"
        data-testid="compose-title"
      />
      <textarea
        value={content} onChange={(e) => setContent(e.target.value)}
        placeholder="Share what's on your cosmic mind…"
        required maxLength={5000} rows={4}
        className="cosmic-input resize-none"
        data-testid="compose-content"
      />
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={board} onChange={(e) => setBoard(e.target.value)}
          className="cosmic-input max-w-xs"
          data-testid="compose-board-select"
        >
          <option value="">General feed</option>
          {boards.map((b) => (
            <option key={b.slug} value={b.slug}>{b.icon} {b.name}</option>
          ))}
        </select>
        {error && <span className="text-cosmos-ember text-sm">{error}</span>}
        <button type="submit" disabled={busy} className="cosmic-button ml-auto" data-testid="compose-submit">
          {busy ? 'Casting…' : 'Post'}
        </button>
      </div>
    </form>
  );
}
