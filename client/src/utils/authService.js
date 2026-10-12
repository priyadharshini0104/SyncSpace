// Authentication API client and storage manager for SyncSpace

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const authService = {
  getToken() {
    return localStorage.getItem('sync_token');
  },

  getUser() {
    try {
      const token = this.getToken();
      if (!token) {
        localStorage.removeItem('sync_user');
        return null;
      }
      const saved = localStorage.getItem('sync_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  },

  setSession(token, user) {
    if (token) localStorage.setItem('sync_token', token);
    if (user) localStorage.setItem('sync_user', JSON.stringify(user));
  },

  clearSession() {
    localStorage.removeItem('sync_token');
    localStorage.removeItem('sync_user');
  },

  async getConfig() {
    try {
      const res = await fetch(`${API_BASE}/api/auth/config`);
      if (!res.ok) throw new Error('Failed to fetch auth config');
      return await res.json();
    } catch (err) {
      console.warn('Could not fetch auth config:', err.message);
      return { googleClientId: '', hasGoogleAuth: false };
    }
  },

  async register(name, email, password) {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');
    this.setSession(data.token, data.user);
    return data;
  },

  async login(email, password) {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    this.setSession(data.token, data.user);
    return data;
  },

  async googleAuth(credential) {
    if (!credential) throw new Error('Valid Google credential token is required.');
    const res = await fetch(`${API_BASE}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Google authentication failed');
    this.setSession(data.token, data.user);
    return data;
  },

  async getMe() {
    const token = this.getToken();
    if (!token) return null;

    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (res.status === 401 || res.status === 403) {
        this.clearSession();
        return null;
      }
      if (!res.ok) return null;
      const data = await res.json();
      if (data.user) {
        localStorage.setItem('sync_user', JSON.stringify(data.user));
        return data.user;
      }
      return null;
    } catch (err) {
      console.error('Failed to verify token with /api/auth/me:', err);
      return this.getUser();
    }
  }
};
