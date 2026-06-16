/**
 * AuthContext — FastAPI (JWT) auth integration
 *
 * DEMO_MODE=true  → auto-login as DEMO_USER, no backend needed
 * DEMO_MODE=false → real login via POST /api/auth/login (FastAPI backend)
 *                   JWT stored in localStorage('ib_token'); api.jsx attaches it
 *                   as `Authorization: Bearer <token>` on every request.
 */
import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const DEMO_MODE = (import.meta.env.VITE_DEMO_MODE ?? 'true') !== 'false';
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';
const TOKEN_KEY = 'ib_token';

const DEMO_USER = {
  id: 1,
  name: 'Idris (Admin)',
  email: 'admin@instabiz.in',
  role: 'System Manager',
  full_name: 'Idris',
};

const AuthContext = createContext(null);

// Roles treated as full-access administrators across the app.
// Covers both the demo user ("System Manager") and real backend / legacy roles.
const ADMIN_ROLES = ['admin', 'administrator', 'system manager', 'director'];

export const isAdminRole = (role) =>
  ADMIN_ROLES.includes(String(role || '').trim().toLowerCase());

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};

const authAxios = axios.create({
  baseURL: BACKEND_URL,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(DEMO_MODE ? DEMO_USER : null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (DEMO_MODE) return;
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) { setUser(null); return; }
    // Resume session from stored JWT
    setLoading(true);
    authAxios
      .get('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => setUser(r.data?.user || r.data))
      .catch(() => { localStorage.removeItem(TOKEN_KEY); setUser(null); })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    if (DEMO_MODE) { setUser(DEMO_USER); return DEMO_USER; }
    const r = await authAxios.post('/api/auth/login', { email, password });
    if (r.data?.token) localStorage.setItem(TOKEN_KEY, r.data.token);
    const userData = r.data?.user || { email, name: email, role: 'viewer' };
    setUser(userData);
    return userData;
  };

  const register = async (email, password, name, role = 'viewer') => {
    if (DEMO_MODE) { setUser(DEMO_USER); return DEMO_USER; }
    const r = await authAxios.post('/api/auth/register', { email, password, name, role });
    if (r.data?.token) localStorage.setItem(TOKEN_KEY, r.data.token);
    const userData = r.data?.user || { email, name, role };
    setUser(userData);
    return userData;
  };

  const logout = async () => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
