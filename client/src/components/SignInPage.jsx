import React, { useState, useEffect, useRef } from 'react';
import { authService } from '../utils/authService';

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
  </svg>
);

export default function SignInPage({ onAuthSuccess }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [googleClientId, setGoogleClientId] = useState('');

  const googleBtnRef = useRef(null);
  const gisInitializedRef = useRef(false);

  useEffect(() => {
    authService.getConfig().then((config) => {
      const cid = config.googleClientId || import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
      setGoogleClientId(cid);
    });
  }, []);

  // Initialize Google Identity Services (GIS)
  useEffect(() => {
    if (!googleClientId) return;

    const renderGoogleBtn = () => {
      if (window.google?.accounts?.id && googleBtnRef.current) {
        try {
          if (!gisInitializedRef.current) {
            window.google.accounts.id.initialize({
              client_id: googleClientId,
              callback: async (response) => {
                setLoading(true);
                setError('');
                try {
                  const data = await authService.googleAuth(response.credential);
                  onAuthSuccess(data.user);
                } catch (err) {
                  setError(err.message || 'Google authentication failed');
                } finally {
                  setLoading(false);
                }
              },
              auto_select: false
            });
            gisInitializedRef.current = true;
          }

          window.google.accounts.id.renderButton(googleBtnRef.current, {
            type: 'standard',
            theme: 'outline',
            size: 'large',
            text: 'signin_with',
            shape: 'pill',
            width: 320,
            logo_alignment: 'left'
          });
          return true;
        } catch (err) {
          console.warn('GIS Init notice:', err);
        }
      }
      return false;
    };

    if (!renderGoogleBtn()) {
      const timer = setInterval(() => {
        if (renderGoogleBtn()) {
          clearInterval(timer);
        }
      }, 200);
      return () => clearInterval(timer);
    }
  }, [googleClientId]);


  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let data;
      if (mode === 'register') {
        if (!name.trim()) throw new Error('Please enter your name');
        if (password.length < 6) throw new Error('Password must be at least 6 characters');
        data = await authService.register(name, email, password);
      } else {
        data = await authService.login(email, password);
      }
      onAuthSuccess(data.user);
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#ffffff', color: '#000000' }}>
      {/* Monochrome Top Chrome Nav */}
      <header style={{
        height: '60px',
        borderBottom: '1px solid #e5e7eb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 32px',
        backgroundColor: '#ffffff'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '9999px',
            backgroundColor: '#000000',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
            fontSize: '14px'
          }}>
            S
          </div>
          <span style={{ fontWeight: '600', fontSize: '18px', letterSpacing: '-0.4px' }}>SyncSpace</span>
          <span className="caption" style={{ color: '#6b7280', marginLeft: '8px' }}>
            AUTHENTICATION PORTAL
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span className="caption" style={{ color: '#4b5563' }}>SyncSpace Workspace &middot; Real-Time CRDTs</span>
        </div>
      </header>

      {/* Main Content Body */}
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 24px' }}>
        <div style={{
          width: '100%',
          maxWidth: '1080px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '32px',
          alignItems: 'stretch'
        }}>
          
          {/* Left: Oversized Pastel Story Block */}
          <div className="color-block color-block-lime" style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: '480px'
          }}>
            <div>
              <div className="eyebrow" style={{ marginBottom: '16px', color: '#1f2937' }}>
                ARCHITECTURE & REAL-TIME IDE
              </div>
              <h1 className="display-lg" style={{ marginBottom: '20px', color: '#000000' }}>
                Think together, build in real-time.
              </h1>
              <p className="subhead" style={{ color: '#111827', maxWidth: '420px' }}>
                A unified canvas and Monaco code workspace powered by conflict-free Yjs CRDTs and sub-second multi-user awareness.
              </p>
            </div>

            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              padding: '20px 24px',
              border: '1px solid rgba(0,0,0,0.06)',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }}></span>
                <span className="eyebrow" style={{ fontSize: '11px' }}>SYSTEM HIGHLIGHTS</span>
              </div>
              <div style={{ fontSize: '14px', color: '#1f2937', lineHeight: 1.5 }}>
                ✓ <b>Instant Google Sign-In</b> with cryptographic OpenID verification<br />
                ✓ <b>Shared Spaces</b> with partitionable Whiteboards and Code buffers<br />
                ✓ <b>Yjs CRDTs</b> ensuring zero merge conflicts & sub-second sync
              </div>
            </div>
          </div>

          {/* Right: Clean Editorial Sign-In Card */}
          <div style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: '24px',
            padding: '40px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center'
          }}>
            <div style={{ marginBottom: '24px' }}>
              <div className="eyebrow" style={{ color: '#6b7280', marginBottom: '8px' }}>
                SECURE ACCESS
              </div>
              <h2 className="headline" style={{ color: '#000000' }}>
                {mode === 'login' ? 'Sign in to your account' : 'Create your account'}
              </h2>
            </div>

            {/* Pill Toggle for Sign In / Register */}
            <div style={{
              display: 'flex',
              backgroundColor: '#f3f4f6',
              padding: '4px',
              borderRadius: '9999px',
              marginBottom: '24px'
            }}>
              <button
                type="button"
                onClick={() => { setMode('login'); setError(''); }}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '9999px',
                  border: 'none',
                  backgroundColor: mode === 'login' ? '#000000' : 'transparent',
                  color: mode === 'login' ? '#ffffff' : '#4b5563',
                  fontWeight: '500',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setMode('register'); setError(''); }}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '9999px',
                  border: 'none',
                  backgroundColor: mode === 'register' ? '#000000' : 'transparent',
                  color: mode === 'register' ? '#ffffff' : '#4b5563',
                  fontWeight: '500',
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                Register
              </button>
            </div>

            {error && (
              <div style={{
                backgroundColor: '#fee2e2',
                border: '1px solid #fecaca',
                color: '#b91c1c',
                padding: '12px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                marginBottom: '20px'
              }}>
                ⚠️ {error}
              </div>
            )}

            {/* --- GOOGLE SIGN-IN SECTION (OFFICIAL GOOGLE IDENTITY SERVICES) --- */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'center', width: '100%', minHeight: '44px' }}>
                <div ref={googleBtnRef} style={{ display: 'flex', justifyContent: 'center', width: '100%' }} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '10px' }}>
                <span className="caption" style={{ color: '#6b7280', fontSize: '11px' }}>
                  🔒 Cryptographically Verified Google OAuth 2.0
                </span>
              </div>
            </div>

            {/* Hairline Divider */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              margin: '20px 0',
              color: '#9ca3af'
            }}>
              <div style={{ flex: 1, height: '1px', backgroundColor: '#e5e7eb' }} />
              <span className="caption" style={{ padding: '0 12px', color: '#6b7280' }}>
                or continue with email
              </span>
              <div style={{ flex: 1, height: '1px', backgroundColor: '#e5e7eb' }} />
            </div>

            {/* Local Email/Password Form */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {mode === 'register' && (
                <div>
                  <label className="caption" style={{ display: 'block', marginBottom: '6px', color: '#374151' }}>
                    FULL NAME
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Priyadharshini R"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="sync-input"
                  />
                </div>
              )}

              <div>
                <label className="caption" style={{ display: 'block', marginBottom: '6px', color: '#374151' }}>
                  EMAIL ADDRESS
                </label>
                <input
                  type="email"
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="sync-input"
                />
              </div>

              <div>
                <label className="caption" style={{ display: 'block', marginBottom: '6px', color: '#374151' }}>
                  PASSWORD
                </label>
                <input
                  type="password"
                  placeholder={mode === 'register' ? 'At least 6 characters' : 'Enter your password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="sync-input"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="button-primary"
                style={{
                  width: '100%',
                  marginTop: '8px',
                  padding: '14px 24px',
                  fontSize: '15px'
                }}
              >
                {loading
                  ? 'Connecting...'
                  : mode === 'register' ? 'Create Account & Continue →' : 'Sign In →'}
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: '24px' }}>
              <span className="caption" style={{ color: '#9ca3af' }}>
                🔒 256-Bit JWT Encryption &middot; Bcrypt Hashed &middot; OAuth 2.0
              </span>
            </div>
          </div>

        </div>
      </main>

      {/* Monochrome Footer */}
      <footer style={{
        height: '48px',
        borderTop: '1px solid #e5e7eb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 32px',
        backgroundColor: '#ffffff'
      }}>
        <span className="caption" style={{ color: '#9ca3af' }}>
          SyncSpace &middot; Real-Time Whiteboard & Code IDE
        </span>
        <span className="caption" style={{ color: '#9ca3af' }}>
          Inter + JetBrains Mono &middot; SyncSpace Production System
        </span>
      </footer>
    </div>
  );
}
