import React, { useEffect, useState } from 'react';
import { api, formatApiError } from '../lib/api';
import { Trash2 } from 'lucide-react';

const MODES = [
  {
    key: 'phase',
    label: '🌙 Phase Reflection',
    placeholder: 'How is this moon phase showing up in your life right now?',
    help: 'Consider the current phase — are you planting, building, refining, releasing, or resting?',
  },
  {
    key: 'chart',
    label: '✨ Chart Resonance',
    placeholder: 'How does your birth chart (sun, moon, rising) relate to what you\u2019re feeling?',
    help: 'Think about your sun, moon, and rising signs. Are they at ease or in tension with the current moon transit?',
  },
  {
    key: 'free',
    label: '📖 Free Write',
    placeholder: 'Whatever is present — without filter, without judgment. This is always here for you.',
    help: 'If none of the guided prompts resonate, write whatever is on your mind. The moon doesn\u2019t judge.',
  },
];

export default function Journal() {
  const [mode, setMode] = useState('phase');
  const [text, setText] = useState('');
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const activeMode = MODES.find((m) => m.key === mode);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/journal');
      setEntries(data);
    } catch (e) {
      setError(formatApiError(e.response?.data?.detail));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!text.trim()) return;
    setBusy(true);
    setError('');
    try {
      const { data } = await api.post('/journal', { prompt_type: mode, content: text.trim() });
      setEntries((prev) => [data, ...prev]);
      setText('');
    } catch (e) {
      setError(formatApiError(e.response?.data?.detail));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
    try {
      await api.delete(`/journal/${id}`);
    } catch (e) {
      load(); // re-sync if the delete failed
    }
  };

  const modeLabel = (key) => MODES.find((m) => m.key === key)?.label || key;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <div className="mb-5">
        <div className="label-mono text-cosmos-purple">Private &amp; Yours</div>
        <h1 className="display text-2xl sm:text-3xl font-black text-cosmos-glow mt-1">LUNA JOURNAL</h1>
        <p className="text-cosmos-mist text-sm mt-1">Three prompts. One moon. Your voice.</p>
      </div>

      {/* Disclaimer */}
      <div className="cosmic-card p-4 mb-6 border border-cosmos-violet/30" data-testid="journal-disclaimer">
        <p className="text-cosmos-mist text-xs sm:text-sm leading-relaxed">
          This is a private journal. What you write here remains yours. You are solely
          responsible for the content you create, and you agree not to use this space for
          unlawful or harmful purposes.
        </p>
      </div>

      {/* Mode selector — wraps to multiple rows on small screens */}
      <div className="flex flex-wrap gap-2 mb-4" role="tablist">
        {MODES.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => setMode(m.key)}
            className={
              mode === m.key
                ? 'cosmic-button text-sm px-3 py-2'
                : 'ghost-button text-sm px-3 py-2'
            }
            data-testid={`journal-mode-${m.key}`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Prompt card */}
      <div className="cosmic-card p-4 sm:p-5 mb-3">
        <p className="text-cosmos-mist text-sm italic">{activeMode.help}</p>
      </div>

      {/* Composer */}
      <div className="cosmic-card p-4 sm:p-5 space-y-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={activeMode.placeholder}
          rows={7}
          maxLength={5000}
          className="cosmic-input resize-none w-full"
          data-testid="journal-input"
        />
        <div className="flex items-center justify-between gap-3">
          <span className="text-cosmos-mist text-xs">{text.length}/5000</span>
          <button
            onClick={submit}
            disabled={busy || !text.trim()}
            className="cosmic-button"
            data-testid="journal-submit"
          >
            {busy ? 'Sealing…' : '🌙 Seal Entry to the Moon'}
          </button>
        </div>
        {error && <div className="text-cosmos-ember text-sm">{error}</div>}
      </div>

      {/* Entries */}
      <div className="mt-8">
        <div className="label-mono text-cosmos-mist mb-3">— Your Sealed Entries —</div>
        {loading ? (
          <div className="text-center text-cosmos-mist py-8">Gathering your reflections…</div>
        ) : entries.length === 0 ? (
          <div className="cosmic-card p-8 text-center">
            <div className="text-5xl mb-2">🌑</div>
            <div className="display text-cosmos-glow">No entries yet.</div>
            <p className="text-cosmos-mist text-sm mt-1">The moon is waiting for your first reflection.</p>
          </div>
        ) : (
          <div className="space-y-3" data-testid="journal-entries">
            {entries.map((e) => (
              <div key={e.id} className="cosmic-card p-4">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="label-mono text-cosmos-purple text-xs">{e.phase}</span>
                    <span className="label-mono text-cosmos-mist text-xs">{modeLabel(e.prompt_type)}</span>
                  </div>
                  <button
                    onClick={() => remove(e.id)}
                    className="text-cosmos-mist hover:text-cosmos-ember transition p-1"
                    aria-label="Delete entry"
                    data-testid={`journal-delete-${e.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-cosmos-glow text-sm leading-relaxed whitespace-pre-wrap">{e.content}</p>
                <div className="text-cosmos-mist text-xs mt-2">
                  {new Date(e.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-center text-cosmos-mist text-xs mt-8 border-t border-cosmos-line pt-4">
        Your journal is private. Only you can see what you've written.
      </p>
    </div>
  );
}