import React from 'react';
import { useAuth } from '../lib/auth';

export default function Avatar({ user, size = 40, className = '' }) {
  const initials = (user?.username || '?').slice(0, 2).toUpperCase();
  const seed = (user?.username || '?').charCodeAt(0) || 0;
  const palette = [
    'from-cosmos-violet to-cosmos-purple',
    'from-cosmos-azure to-cosmos-blue',
    'from-cosmos-deep to-cosmos-violet',
    'from-cosmos-ember to-cosmos-gold',
    'from-cosmos-blue to-cosmos-purple',
  ];
  const grad = palette[seed % palette.length];
  if (user?.avatar_url) {
    return (
      <img
        src={user.avatar_url}
        alt={user.username}
        style={{ width: size, height: size }}
        className={`rounded-full object-cover border border-cosmos-violet/40 ${className}`}
      />
    );
  }
  return (
    <div
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      className={`rounded-full bg-gradient-to-br ${grad} text-white font-display font-bold flex items-center justify-center border border-white/10 shadow-md ${className}`}
      data-testid="user-avatar"
    >
      {initials}
    </div>
  );
}
