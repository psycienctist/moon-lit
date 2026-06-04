import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from './api';

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null); // null=loading, false=unauthed, obj=authed
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const { data } = await api.get('/auth/me');
      setUser(data);
    } catch {
      setUser(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    if (data.token) localStorage.setItem('lunatick_token', data.token);
    setUser(data.user);
    return data.user;
  };
  const register = async (email, password, username) => {
    const { data } = await api.post('/auth/register', { email, password, username });
    if (data.token) localStorage.setItem('lunatick_token', data.token);
    setUser(data.user);
    return data.user;
  };
  const logout = async () => {
    try { await api.post('/auth/logout'); } catch {}
    localStorage.removeItem('lunatick_token');
    setUser(false);
  };
  const setUserData = (u) => setUser(u);

  return (
    <AuthCtx.Provider value={{ user, loading, login, register, logout, refresh, setUserData }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() { return useContext(AuthCtx); }
