/**
 * AuthContext — Frappe auth integration
 *
 * DEMO_MODE=true  → auto-login as DEMO_USER, no backend needed
 * DEMO_MODE=false → real Frappe login via POST /api/method/login
 *                   Frappe uses cookie (sid) — no JWT token storage
 */
import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const DEMO_MODE = (import.meta.env.VITE_DEMO_MODE ?? 'true') !== 'false';
const FRAPPE_URL = import.meta.env.VITE_BACKEND_URL || 'http://172.30.52.244:8000';

const DEMO_USER = {
  id: 1,
  name: 'Idris (Admin)',
  email: 'admin@instabiz.in',
  role: 'System Manager',
  full_name: 'Idris',
};

const AuthContext = createContext(null);

// Roles treated as full-access administrators across the app.
// Covers both the demo user ("System Manager") and real Frappe / legacy roles.
const ADMIN_ROLES = ['admin', 'administrator', 'system manager', 'director'];

export const isAdminRole = (role) =>
  ADMIN_ROLES.includes(String(role || '').trim().toLowerCase());

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(DEMO_MODE ? DEMO_USER : null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (DEMO_MODE) return;
    // Check existing Frappe session (cookie-based)
    setLoading(true);
    axios
      .get(`${FRAPPE_URL}/api/method/frappe.auth.get_logged_user`, { withCredentials: true })
      .then((r) => {
        const email = r.data.message;
        if (email && email !== 'Guest') {
          setUser({ email, name: email, role: 'admin' });
        } else {
          setUser(null);
        }
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    if (DEMO_MODE) { setUser(DEMO_USER); return DEMO_USER; }
    // Frappe login
    const r = await axios.post(
      `${FRAPPE_URL}/api/method/login`,
      { usr: email, pwd: password },
      { withCredentials: true }
    );
    const userData = {
      email,
      name: r.data.full_name || email,
      role: r.data.user_type || 'admin',
    };
    setUser(userData);
    return userData;
  };

  const register = async () => {
    throw new Error('User creation must be done via Frappe → System Settings → User.');
  };

  const logout = async () => {
    if (!DEMO_MODE) {
      try {
        await axios.get(`${FRAPPE_URL}/api/method/logout`, { withCredentials: true });
      } catch (_) {}
    }
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
