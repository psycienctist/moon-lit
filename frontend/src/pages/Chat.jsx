import React, { useEffect, useRef, useState } from 'react';
import { api, wsUrl } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Link } from 'react-router-dom';
import Avatar from '../components/Avatar';
import TimeAgo from '../components/TimeAgo';
import { Send, Users } from 'lucide-react';

export default function Chat() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [presence, setPresence] = useState({ users: [], count: 0 });
  const [content, setContent] = useState('');
  const [connected, setConnected] = useState(false);
  const wsRef = useRef(null);
  const scrollRef = useRef(null);

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    });
  };

  // Load history once
  useEffect(() => {
    api.get('/chat/history').then((r) => { setMessages(r.data); scrollToBottom(); });
  }, []);

  // WS connect when logged in
  useEffect(() => {
    if (!user) return;
    const tok = localStorage.getItem('lunatick_token');
    if (!tok) return;
    const url = wsUrl(`/api/ws/chat?token=${encodeURIComponent(tok)}`);
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);
    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === 'message') {
          setMessages((prev) => [...prev, msg]);
          scrollToBottom();
        } else if (msg.type === 'presence') {
          setPresence({ users: msg.users || [], count: msg.count || 0 });
        }
      } catch {}
    };

    const ping = setInterval(() => {
      if (ws.readyState === 1) ws.send(JSON.stringify({ type: 'ping' }));
    }, 25000);

    return () => { clearInterval(ping); ws.close(); };
  }, [user]);

  const send = (e) => {
    e.preventDefault();
    const text = content.trim();
    if (!text || !wsRef.current || wsRef.current.readyState !== 1) return;
    wsRef.current.send(JSON.stringify({ type: 'message', content: text }));
    setContent('');
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <div className="label-mono text-cosmos-purple">Live Chatroom</div>
          <h1 className="display text-3xl font-black text-cosmos-glow mt-1">FREQUENCY OPEN</h1>
          <p className="text-cosmos-mist text-sm mt-1">Real-time signal across the orbit. Mind the cosmic etiquette.</p>
        </div>
        <div className={`label-mono px-3 py-1.5 rounded-full border ${connected ? 'border-emerald-500/40 text-emerald-300 bg-emerald-500/10' : 'border-cosmos-ember/40 text-cosmos-ember bg-cosmos-ember/10'}`}>
          <span className="inline-block w-2 h-2 rounded-full mr-2 align-middle"
            style={{ background: connected ? '#34d399' : '#ff7b72', boxShadow: connected ? '0 0 8px #34d399' : 'none' }} />
          {connected ? 'Live' : 'Disconnected'}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_240px] gap-4">
        <div className="cosmic-card flex flex-col h-[68vh] overflow-hidden">
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3" data-testid="chat-messages">
            {messages.length === 0 ? (
              <div className="text-center text-cosmos-mist py-12">No transmissions yet — break the silence.</div>
            ) : messages.map((m) => (
              <div key={m.id} className="flex items-start gap-3 animate-fade-in" data-testid={`chat-msg-${m.id}`}>
                <Avatar user={m.author} size={32} />
                <div className="min-w-0">
                  <div className="text-xs flex items-baseline gap-2">
                    <Link to={`/u/${m.author?.username}`} className="text-cosmos-glow font-semibold hover:text-cosmos-purple">
                      {m.author?.username}
                    </Link>
                    <TimeAgo iso={m.created_at} className="text-cosmos-mist" />
                  </div>
                  <div className="text-cosmos-glow/95 break-words">{m.content}</div>
                </div>
              </div>
            ))}
          </div>
          {user ? (
            <form onSubmit={send} className="border-t border-cosmos-line p-3 flex items-center gap-2" data-testid="chat-form">
              <input
                value={content} onChange={(e) => setContent(e.target.value)}
                placeholder={connected ? 'Send into the void…' : 'Connecting…'}
                maxLength={1000} disabled={!connected}
                className="cosmic-input"
                data-testid="chat-input"
              />
              <button type="submit" disabled={!connected || !content.trim()} className="cosmic-button !px-4 !py-2.5" data-testid="chat-send">
                <Send className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <div className="border-t border-cosmos-line p-4 text-center text-sm text-cosmos-mist">
              <Link to="/login" className="text-cosmos-purple hover:underline">Log in</Link> to join the live frequency.
            </div>
          )}
        </div>

        <aside className="cosmic-card p-4 h-[68vh] overflow-y-auto">
          <div className="flex items-center gap-2 label-mono text-cosmos-glow mb-3">
            <Users className="w-4 h-4 text-cosmos-purple" />
            Online · {presence.count}
          </div>
          {presence.users.length === 0 ? (
            <div className="text-sm text-cosmos-mist">Awaiting cosmonauts…</div>
          ) : (
            <ul className="space-y-2" data-testid="presence-list">
              {presence.users.map((u) => (
                <li key={u.id} className="flex items-center gap-2 text-sm">
                  <Avatar user={u} size={24} />
                  <Link to={`/u/${u.username}`} className="text-cosmos-glow hover:text-cosmos-purple">{u.username}</Link>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </div>
  );
}
