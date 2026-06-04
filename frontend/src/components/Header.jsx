import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import Avatar from './Avatar';
import { LogOut, Moon } from 'lucide-react';

export default function Header() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);

  return (
    <header className="border-b border-cosmos-violet/20 bg-cosmos-void/70 backdrop-blur-xl sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group" data-testid="brand-link">
          <Moon className="text-cosmos-purple w-6 h-6 group-hover:rotate-12 transition-transform" />
          <div className="display text-2xl font-black tracking-[0.3em] text-cosmos-purple">LUNATICK</div>
          <span className="hidden sm:inline label-mono text-cosmos-mist ml-1">COMMUNITY</span>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-3">
          <Link to="/feed" className="ghost-button hidden sm:inline-block" data-testid="nav-feed">Feed</Link>
          <Link to="/boards" className="ghost-button hidden sm:inline-block" data-testid="nav-boards">Boards</Link>
          <Link to="/chat" className="ghost-button hidden sm:inline-block" data-testid="nav-chat">Chatroom</Link>
          {user ? (
            <div className="relative">
              <button
                className="flex items-center gap-2 rounded-full px-1.5 py-1 hover:bg-cosmos-violet/20 transition"
                onClick={() => setOpen((o) => !o)}
                data-testid="user-menu-button"
              >
                <Avatar user={user} size={32} />
                <span className="hidden sm:inline text-sm text-cosmos-glow font-medium">{user.username}</span>
              </button>
              {open && (
                <div className="absolute right-0 mt-2 w-44 cosmic-card p-2 shadow-glow z-50">
                  <Link
                    to={`/u/${user.username}`}
                    onClick={() => setOpen(false)}
                    className="block px-3 py-2 text-sm rounded hover:bg-cosmos-violet/20 text-cosmos-glow"
                    data-testid="menu-profile"
                  >
                    My Profile
                  </Link>
                  <Link
                    to="/settings"
                    onClick={() => setOpen(false)}
                    className="block px-3 py-2 text-sm rounded hover:bg-cosmos-violet/20 text-cosmos-glow"
                    data-testid="menu-settings"
                  >
                    Edit Profile
                  </Link>
                  <button
                    onClick={async () => { setOpen(false); await logout(); nav('/login'); }}
                    className="w-full text-left px-3 py-2 text-sm rounded hover:bg-cosmos-ember/20 text-cosmos-ember flex items-center gap-2"
                    data-testid="menu-logout"
                  >
                    <LogOut className="w-4 h-4" /> Log out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link to="/login" className="ghost-button" data-testid="nav-login">Log in</Link>
              <Link to="/register" className="cosmic-button" data-testid="nav-register">Join</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
