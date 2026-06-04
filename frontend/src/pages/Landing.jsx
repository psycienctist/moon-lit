import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { Moon, MessageCircle, Layers, Sparkles } from 'lucide-react';

export default function Landing() {
  const { user } = useAuth();
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <section className="text-center mb-12 animate-fade-in">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cosmos-purple/40 bg-cosmos-violet/10 text-cosmos-purple label-mono mb-5">
          <Moon className="w-3 h-3" /> Lunatick · Community
        </div>
        <h1 className="display text-4xl sm:text-6xl font-black text-cosmos-glow leading-[1.05]">
          GATHER UNDER<br />THE SAME MOON.
        </h1>
        <p className="text-cosmos-mist max-w-xl mx-auto mt-5 text-base sm:text-lg">
          A space for likeminded cosmonauts to share rituals, sightings, signs, and
          the strange poetry of lunar living.
        </p>
        <div className="mt-7 flex items-center justify-center gap-3">
          {user ? (
            <Link to="/feed" className="cosmic-button" data-testid="landing-cta-feed">Enter the orbit</Link>
          ) : (
            <>
              <Link to="/register" className="cosmic-button" data-testid="landing-cta-register">Join the Lunatick</Link>
              <Link to="/login" className="ghost-button" data-testid="landing-cta-login">Log in</Link>
            </>
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link to="/chat" className="cosmic-card p-6 hover:border-cosmos-purple/60 group transition-all">
          <MessageCircle className="w-6 h-6 text-cosmos-blue group-hover:text-cosmos-purple" />
          <h3 className="display text-lg font-bold text-cosmos-glow mt-3">Live Chatroom</h3>
          <p className="text-sm text-cosmos-mist mt-1">Real-time signal across cosmonauts in orbit right now.</p>
        </Link>
        <Link to="/feed" className="cosmic-card p-6 hover:border-cosmos-purple/60 group transition-all">
          <Sparkles className="w-6 h-6 text-cosmos-purple group-hover:text-cosmos-glow" />
          <h3 className="display text-lg font-bold text-cosmos-glow mt-3">Single Feed</h3>
          <p className="text-sm text-cosmos-mist mt-1">A unified timeline of every thought from every board.</p>
        </Link>
        <Link to="/boards" className="cosmic-card p-6 hover:border-cosmos-purple/60 group transition-all">
          <Layers className="w-6 h-6 text-cosmos-azure group-hover:text-cosmos-purple" />
          <h3 className="display text-lg font-bold text-cosmos-glow mt-3">Message Boards</h3>
          <p className="text-sm text-cosmos-mist mt-1">Constellations of conversation — rituals, sightings, memes & more.</p>
        </Link>
      </section>
    </div>
  );
}
