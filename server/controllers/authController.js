import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { userRepository } from '../services/db.js';
import { generateToken } from '../middleware/authMiddleware.js';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const googleOAuthClient = new OAuth2Client(GOOGLE_CLIENT_ID);

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Register a new user with email & password
 */
export async function register(req, res) {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are all required.' });
    }

    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) {
      if (existingUser.provider === 'google' && !existingUser.passwordHash) {
        return res.status(409).json({
          error: 'An account with this email was created via Google Sign-In. Please sign in with Google.'
        });
      }
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await userRepository.createUser({
      name: name.trim(),
      email: email.trim(),
      passwordHash,
      provider: 'local'
    });

    const token = generateToken(user);
    const userJson = typeof user.toJSON === 'function' ? user.toJSON() : user;

    return res.status(201).json({
      success: true,
      message: 'Account registered successfully',
      token,
      user: {
        id: userJson.id || userJson._id,
        name: userJson.name,
        email: userJson.email,
        avatar: userJson.avatar,
        provider: userJson.provider
      }
    });
  } catch (err) {
    console.error('[Auth] Registration error:', err);
    return res.status(500).json({ error: 'Server error during registration.', details: err.message });
  }
}

/**
 * Login with email and password
 */
export async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await userRepository.findByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (!user.passwordHash) {
      if (user.provider === 'google') {
        return res.status(401).json({
          error: 'This account uses Google Sign-In. Please click "Sign in with Google".'
        });
      }
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    await userRepository.updateUser(user.id || user._id, { lastLogin: new Date() });

    const token = generateToken(user);
    const userJson = typeof user.toJSON === 'function' ? user.toJSON() : user;

    return res.status(200).json({
      success: true,
      message: 'Signed in successfully',
      token,
      user: {
        id: userJson.id || userJson._id,
        name: userJson.name,
        email: userJson.email,
        avatar: userJson.avatar,
        provider: userJson.provider
      }
    });
  } catch (err) {
    console.error('[Auth] Login error:', err);
    return res.status(500).json({ error: 'Server error during sign in.', details: err.message });
  }
}

/**
 * Verify Google ID Token and Authenticate / Upsert User
 */
export async function googleAuth(req, res) {
  try {
    const { credential, demoProfile } = req.body;

    let googleProfile = null;

    // 1. Production Google ID Token (GIS Credential) verification
    if (credential) {
      try {
        // Attempt cryptographic verification via official google-auth-library
        const ticket = await googleOAuthClient.verifyIdToken({
          idToken: credential,
          audience: GOOGLE_CLIENT_ID || undefined
        });
        const payload = ticket.getPayload();
        if (payload) {
          googleProfile = {
            googleId: payload.sub,
            email: payload.email,
            name: payload.name || payload.email.split('@')[0],
            avatar: payload.picture || '',
            emailVerified: payload.email_verified
          };
        }
      } catch (verifyErr) {
        console.warn('[Auth] google-auth-library verify failed, attempting tokeninfo fallback:', verifyErr.message);

        // Fallback: Verify directly with Google TokenInfo API
        try {
          const resp = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
          if (resp.ok) {
            const tokenInfo = await resp.json();
            if (tokenInfo.email) {
              googleProfile = {
                googleId: tokenInfo.sub,
                email: tokenInfo.email,
                name: tokenInfo.name || tokenInfo.email.split('@')[0],
                avatar: tokenInfo.picture || '',
                emailVerified: tokenInfo.email_verified === 'true' || tokenInfo.email_verified === true
              };
            }
          }
        } catch (fetchErr) {
          console.error('[Auth] TokenInfo fallback failed:', fetchErr.message);
        }
      }

      if (!googleProfile) {
        return res.status(401).json({ error: 'Invalid or expired Google credential token.' });
      }
    } else if (demoProfile && process.env.NODE_ENV === 'test') {
      // 2. Automated test suite execution ONLY
      googleProfile = {
        googleId: 'google_demo_' + (demoProfile.id || '987654321'),
        email: demoProfile.email || 'developer@google-demo.syncspace.io',
        name: demoProfile.name || 'Google Cloud Architect',
        avatar: demoProfile.avatar || 'https://lh3.googleusercontent.com/a/default-user=s96-c',
        emailVerified: true
      };
    } else {
      return res.status(400).json({ error: 'Valid Google credential token is required. Unauthorized login bypass rejected.' });
    }

    if (!googleProfile.email) {
      return res.status(400).json({ error: 'No email found in Google profile.' });
    }

    // 3. User Resolution and Account Linking
    let user = await userRepository.findByEmail(googleProfile.email);

    if (user) {
      // Account Linking: Link existing user with Google credentials
      const updates = {
        googleId: googleProfile.googleId,
        avatar: user.avatar || googleProfile.avatar,
        lastLogin: new Date()
      };
      if (user.provider === 'local') {
        updates.provider = 'both';
      }
      user = await userRepository.updateUser(user.id || user._id, updates);
    } else {
      // Provision New Google User
      user = await userRepository.createUser({
        name: googleProfile.name,
        email: googleProfile.email,
        avatar: googleProfile.avatar,
        provider: 'google',
        googleId: googleProfile.googleId
      });
    }

    const token = generateToken(user);
    const userJson = typeof user.toJSON === 'function' ? user.toJSON() : user;

    return res.status(200).json({
      success: true,
      message: 'Authenticated with Google successfully',
      token,
      user: {
        id: userJson.id || userJson._id,
        name: userJson.name,
        email: userJson.email,
        avatar: userJson.avatar,
        provider: userJson.provider
      }
    });
  } catch (err) {
    console.error('[Auth] Google Auth Error:', err);
    return res.status(500).json({ error: 'Google authentication failed.', details: err.message });
  }
}

/**
 * Get current authenticated user profile using verified JWT
 */
export async function getMe(req, res) {
  try {
    const user = await userRepository.findById(req.user.id) || await userRepository.findByEmail(req.user.email);
    if (!user) {
      return res.status(404).json({ error: 'User profile not found.' });
    }

    const userJson = typeof user.toJSON === 'function' ? user.toJSON() : user;
    return res.status(200).json({
      success: true,
      user: {
        id: userJson.id || userJson._id,
        name: userJson.name,
        email: userJson.email,
        avatar: userJson.avatar,
        provider: userJson.provider,
        createdAt: userJson.createdAt
      }
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to retrieve profile.', details: err.message });
  }
}

/**
 * Expose public client auth configuration (Google Client ID, features)
 */
export function getAuthConfig(req, res) {
  return res.status(200).json({
    googleClientId: GOOGLE_CLIENT_ID,
    hasGoogleAuth: Boolean(GOOGLE_CLIENT_ID),
    authModes: ['local', 'google'],
    storage: userRepository.getStatus()
  });
}
