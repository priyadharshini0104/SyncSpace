import React, { useState, useEffect, useRef } from 'react';
import { authService } from '../utils/authService';

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" style={{ marginRight: '10px', flexShrink: 0 }}>
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    <path fill="none" d="M0 0h48v48H0z"/>
  </svg>
);

export default function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [googleClientId, setGoogleClientId] = useState('');
  const [showGoogleConfig, setShowGoogleConfig] = useState(false);
  const [customClientIdInput, setCustomClientIdInput] = useState('');

  const googleBtnRef = useRef(null);

  // Fetch server auth configuration on mount
  useEffect(() => {
    authService.getConfig().then((config) => {
      const cid = config.googleClientId || import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
      setGoogleClientId(cid);
      setCustomClientIdInput(cid);
    });
  }, []);

  // Initialize Google Identity Services (GIS) if client ID is available and script loaded
  useEffect(() => {
    if (!isOpen) return;

    const initializeGis = () => {
      if (window.google?.accounts?.id && googleClientId) {
        try {
          window.google.accounts.id.initialize({
            client_id: googleClientId,
            callback: handleGoogleCredentialResponse,
            auto_select: false
          });

          if (googleBtnRef.current) {
            window.google.accounts.id.renderButton(googleBtnRef.current, {
              type: 'standard',
              theme: 'filled_black',
              size: 'large',
              text: 'signin_with',
              shape: 'rectangular',
              logo_alignment: 'left',
              width: 340
            });
          }
        } catch (err) {
          console.warn('GIS initialization notice:', err);
        }
      }
    };

    if (window.google?.accounts?.id) {
      initializeGis();
    } else {
      const interval = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(interval);
          initializeGis();
        }
      }, 300);
      return () => clearInterval(interval);
    }
  }, [isOpen, googleClientId]);

  const handleGoogleCredentialResponse = async (response) => {
    setLoading(true);
    setError('');
    try {
      const data = await authService.googleAuth(response.credential);
      onAuthSuccess(data.user);
      onClose();
    } catch (err) {
      setError(err.message || 'Google authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleCustomClick = () => {
    if (window.google?.accounts?.id && googleClientId) {
      try {
        window.google.accounts.id.prompt();
        return;
      } catch (e) {
        console.warn('GIS prompt:', e);
      }
    }
    // If no Google Client ID configured or popup blocked, launch interactive sandbox test
    triggerGoogleDemoAuth();
  };

  const triggerGoogleDemoAuth = async (profileOverride = null) => {
    setLoading(true);
    setError('');
    try {
      const demoProfile = profileOverride || {
        id: 'google_user_' + Math.floor(100000 + Math.random() * 900000),
        name: 'Google Cloud User',
        email: 'developer@google.workspace.syncspace.io',
        avatar: 'https://lh3.googleusercontent.com/a/ACg8ocL_SyncSpaceDevAvatar'
      };

      const data = await authService.googleAuth(null, demoProfile);
      onAuthSuccess(data.user);
      onClose();
    } catch (err) {
      setError(err.message || 'Sandbox Google authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      let data;
      if (mode === 'register') {
        if (!name.trim()) throw new Error('Please enter your full name');
        if (password.length < 6) throw new Error('Password must be at least 6 characters');
        data = await authService.register(name, email, password);
      } else {
        data = await authService.login(email, password);
      }

      onAuthSuccess(data.user);
      onClose();
    } catch (err) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyCustomClientId = (e) => {
    e.preventDefault();
    if (customClientIdInput.trim()) {
      setGoogleClientId(customClientIdInput.trim());
      setShowGoogleConfig(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(5, 8, 15, 0.75)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px'
    }}>
      <div style={{
        backgroundColor: '#111827',
        border: '1px solid #1f2937',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '420px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 255, 255, 0.05)',
        overflow: 'hidden',
        animation: 'modalSlideIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        {/* Top Header */}
        <div style={{
          padding: '24px 28px 16px',
          borderBottom: '1px solid #1f2937',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <div style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '14px',
                fontWeight: 'bold',
                color: '#fff'
              }}>
                ⚡
              </div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#f9fafb' }}>
                {mode === 'login' ? 'Sign In to SyncSpace' : 'Create SyncSpace Account'}
              </h2>
            </div>
            <p style={{ margin: 0, fontSize: '12px', color: '#9ca3af' }}>
              Collaborate live on architecture diagrams, code, and CRDTs
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#9ca3af',
              cursor: 'pointer',
              fontSize: '20px',
              padding: '4px 8px',
              borderRadius: '6px',
              lineHeight: 1
            }}
            title="Close"
          >
            ✕
          </button>
        </div>

        <div style={{ padding: '24px 28px' }}>
          {/* Mode Switch Tabs */}
          <div style={{
            display: 'flex',
            backgroundColor: '#0b0f19',
            padding: '3px',
            borderRadius: '8px',
            marginBottom: '20px',
            border: '1px solid #1f2937'
          }}>
            <button
              onClick={() => { setMode('login'); setError(''); }}
              style={{
                flex: 1,
                padding: '8px',
                border: 'none',
                borderRadius: '6px',
                backgroundColor: mode === 'login' ? '#2563eb' : 'transparent',
                color: mode === 'login' ? '#ffffff' : '#9ca3af',
                fontWeight: '600',
                fontSize: '12px',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              Sign In
            </button>
            <button
              onClick={() => { setMode('register'); setError(''); }}
              style={{
                flex: 1,
                padding: '8px',
                border: 'none',
                borderRadius: '6px',
                backgroundColor: mode === 'register' ? '#2563eb' : 'transparent',
                color: mode === 'register' ? '#ffffff' : '#9ca3af',
                fontWeight: '600',
                fontSize: '12px',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              Register
            </button>
          </div>

          {error && (
            <div style={{
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#f87171',
              padding: '10px 14px',
              borderRadius: '8px',
              fontSize: '12px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span>⚠️</span>
              <span style={{ flex: 1 }}>{error}</span>
            </div>
          )}

          {/* --- GOOGLE SIGN-IN SECTION --- */}
          <div style={{ marginBottom: '18px' }}>
            {googleClientId ? (
              /* Native GIS Render Container (Single Official Button) */
              <div 
                ref={googleBtnRef} 
                style={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  marginBottom: '8px',
                  minHeight: '44px' 
                }} 
              />
            ) : (
              /* Custom Google Sign In Button for when no Client ID is configured */
              <button
                type="button"
                onClick={triggerGoogleDemoAuth}
                disabled={loading}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '11px 16px',
                  backgroundColor: '#ffffff',
                  color: '#1f2937',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                  transition: 'transform 0.1s ease, box-shadow 0.1s ease',
                  opacity: loading ? 0.7 : 1
                }}
              >
                <GoogleIcon />
                <span>{loading ? 'Authenticating...' : 'Sign in with Google (Sandbox)'}</span>
              </button>
            )}

            {/* Google OAuth Sandbox Quick Access Toggle */}
            <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span 
                onClick={() => triggerGoogleDemoAuth({
                  id: 'google_cloud_dev_1',
                  name: 'Priyanka (Google OAuth)',
                  email: 'priyanka@google.corp.syncspace.io',
                  avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=PriyankaGoogle'
                })}
                style={{ fontSize: '11px', color: '#60a5fa', cursor: 'pointer', textDecoration: 'underline' }}
                title="Instant one-click test with a verified Google profile"
              >
                ⚡ Test with Google Sandbox Account
              </span>
              <span 
                onClick={() => setShowGoogleConfig(!showGoogleConfig)}
                style={{ fontSize: '11px', color: '#9ca3af', cursor: 'pointer' }}
              >
                ⚙️ {googleClientId ? 'Configured' : 'Client ID'}
              </span>
            </div>

            {/* Optional Google Client ID Input for custom OAuth apps */}
            {showGoogleConfig && (
              <form onSubmit={handleApplyCustomClientId} style={{ marginTop: '10px', padding: '10px', background: '#0b0f19', borderRadius: '6px', border: '1px solid #374151' }}>
                <div style={{ fontSize: '11px', color: '#cbd5e1', marginBottom: '6px' }}>
                  Google OAuth 2.0 Web Client ID:
                </div>
                <input 
                  type="text" 
                  value={customClientIdInput} 
                  onChange={(e) => setCustomClientIdInput(e.target.value)} 
                  placeholder="e.g. 123456789-xyz.apps.googleusercontent.com"
                  style={{
                    width: '100%',
                    padding: '6px 8px',
                    borderRadius: '4px',
                    background: '#111827',
                    border: '1px solid #4b5563',
                    color: '#fff',
                    fontSize: '11px',
                    boxSizing: 'border-box',
                    marginBottom: '6px'
                  }}
                />
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button 
                    type="submit" 
                    style={{ padding: '4px 10px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}
                  >
                    Save Client ID
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setShowGoogleConfig(false)} 
                    style={{ padding: '4px 8px', background: 'transparent', color: '#9ca3af', border: 'none', fontSize: '11px', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Divider */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            margin: '18px 0',
            color: '#6b7280',
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            <div style={{ flex: 1, height: '1px', backgroundColor: '#1f2937' }} />
            <span style={{ padding: '0 10px' }}>or continue with email</span>
            <div style={{ flex: 1, height: '1px', backgroundColor: '#1f2937' }} />
          </div>

          {/* --- EMAIL & PASSWORD FORM --- */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {mode === 'register' && (
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#d1d5db', marginBottom: '5px' }}>
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Jones Antony"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    backgroundColor: '#0b0f19',
                    border: '1px solid #374151',
                    color: '#f9fafb',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                    outline: 'none'
                  }}
                />
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#d1d5db', marginBottom: '5px' }}>
                Email Address
              </label>
              <input
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  backgroundColor: '#0b0f19',
                  border: '1px solid #374151',
                  color: '#f9fafb',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                  outline: 'none'
                }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                <label style={{ fontSize: '12px', fontWeight: '500', color: '#d1d5db' }}>
                  Password
                </label>
                <span 
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ fontSize: '11px', color: '#9ca3af', cursor: 'pointer' }}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </span>
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder={mode === 'register' ? 'At least 6 characters' : 'Your password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  backgroundColor: '#0b0f19',
                  border: '1px solid #374151',
                  color: '#f9fafb',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                  outline: 'none'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: '6px',
                padding: '11px',
                borderRadius: '8px',
                border: 'none',
                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.35)',
                transition: 'all 0.15s ease',
                opacity: loading ? 0.7 : 1
              }}
            >
              {loading 
                ? 'Processing...' 
                : mode === 'register' ? 'Create Account & Generate JWT' : 'Sign In with JWT'}
            </button>
          </form>

          {/* Footer note */}
          <div style={{
            marginTop: '20px',
            textAlign: 'center',
            fontSize: '11px',
            color: '#6b7280',
            borderTop: '1px solid #1f2937',
            paddingTop: '14px'
          }}>
            🔒 256-Bit JWT Encryption &middot; Bcrypt Salted Hashing &middot; OAuth 2.0
          </div>
        </div>
      </div>
    </div>
  );
}
