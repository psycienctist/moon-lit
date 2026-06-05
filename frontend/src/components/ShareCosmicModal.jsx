import React, { useEffect, useState } from 'react';
import { api, formatApiError } from '../lib/api';
import CosmicCard from './CosmicCard';
import { Sparkles, X } from 'lucide-react';

export default function ShareCosmicModal({ boards = [], onClose, onShared }) {
  const [snapshot, setSnapshot] = useState(null);
  const [note, setNote] = useState('');
  const [board, setBoard] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get('/cosmic/me')
      .then((r) => setSnapshot(r.data))
      .catch((e) => setError(formatApiError(e.response?.data?.detail) || e.message));
  }, []);

  const submit = async (e) => {
    e.preventDefault(); setError(''); setBusy(true);
    try {
      const { data } = await api.post('/cosmic/share', {
        board_slug: board || null,
        note: note.trim() || null,
      });
      onShared && onShared(data);
      onClose && onClose();
    } catch (err) {
      setError(formatApiError(err.response?.data?.detail));
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={onClose} data-testid="share-cosmic-modal">
      <div onClick={(e) => e.stopPropagation()} className="cosmic-card max-w-lg w-full p-5 shadow-glow relative animate-slide-up">
        <button onClick={onClose} className="absolute right-3 top-3 text-cosmos-mist hover:text-cosmos-glow" data-testid="share-modal-close">
          <X className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-5 h-5 text-cosmos-purple" />
          <h2 className="display text-xl font-black text-cosmos-glow">SHARE YOUR COSMIC CARD</h2>
        </div>
        <p className="text-sm text-cosmos-mist mb-4">A snapshot of where the sky stands — and where you stand within it — posted to the community.</p>

        {error && <div className="text-cosmos-ember text-sm mb-3">{error}</div>}

        {snapshot ? (
          <div className="space-y-4">
            <CosmicCard data={snapshot} />

            <form onSubmit={submit} className="space-y-3">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add a note (optional) — what's the moon telling you today?"
                maxLength={500} rows={2}
                className="cosmic-input resize-none"
                data-testid="share-cosmic-note"
              />
              <div className="flex items-center gap-2">
                <select
                  value={board} onChange={(e) => setBoard(e.target.value)}
                  className="cosmic-input max-w-xs"
                  data-testid="share-cosmic-board"
                >
                  <option value="">General feed</option>
                  {boards.map((b) => (
                    <option key={b.slug} value={b.slug}>{b.icon} {b.name}</option>
                  ))}
                </select>
                <button disabled={busy} className="cosmic-button ml-auto" data-testid="share-cosmic-submit">
                  {busy ? 'Casting…' : 'Share to community'}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="text-center text-cosmos-mist py-6">Reading the sky…</div>
        )}
      </div>
    </div>
  );
}
