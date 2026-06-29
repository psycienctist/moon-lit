import React, { useState } from 'react';
import { api, formatApiError } from '../lib/api';
import { X, Send } from 'lucide-react';

export default function TradeRequestModal({ targetUsername, onClose, onSent }) {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault(); setError(''); setBusy(true);
    try {
      const { data } = await api.post('/trades', {
        username: targetUsername,
        message: message.trim() || null,
      });
      onSent && onSent(data);
      onClose && onClose();
    } catch (err) {
      setError(formatApiError(err.response?.data?.detail));
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={onClose} data-testid="trade-request-modal">
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="cosmic-card max-w-md w-full p-5 shadow-glow relative animate-slide-up"
      >
        <button type="button" onClick={onClose} className="absolute right-3 top-3 text-cosmos-mist hover:text-cosmos-glow">
          <X className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 mb-2">
          <Send className="w-5 h-5 text-cosmos-purple" />
          <h2 className="display text-lg font-black text-cosmos-glow">SEND YOUR COSMIC CARD</h2>
        </div>
        <p className="text-sm text-cosmos-mist mb-4">
          You'll send <span className="text-cosmos-glow">{`@${targetUsername}`}</span> your card. If they accept, you'll trade cards and become friends in the cosmos.
        </p>
        <textarea
          value={message} onChange={(e) => setMessage(e.target.value)}
          placeholder="Optional message (e.g., 'Felt a pull under tonight's moon — trade?')"
          maxLength={300} rows={3}
          className="cosmic-input resize-none"
          data-testid="trade-message-input"
        />
        {error && <div className="text-cosmos-ember text-sm mt-2">{error}</div>}
        <div className="mt-4 flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="ghost-button" data-testid="trade-cancel">Cancel</button>
          <button type="submit" disabled={busy} className="cosmic-button" data-testid="trade-send-submit">
            {busy ? 'Sending…' : 'Send card'}
          </button>
        </div>
      </form>
    </div>
  );
}
