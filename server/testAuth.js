import http from 'http';
import dotenv from 'dotenv';

dotenv.config();

const PORT = 5055; // Use dedicated test port
process.env.PORT = String(PORT);
process.env.NODE_ENV = 'test';

// Import server app
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/authRoutes.js';
import { userRepository } from './services/db.js';

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'Test Server Active' });
});

const server = app.listen(PORT, async () => {
  console.log(`[TEST SUITE] Auth Test Server started on port ${PORT}`);

  try {
    let testPassed = 0;
    let testFailed = 0;

    const assert = (condition, msg) => {
      if (condition) {
        console.log(`  ✅ PASS: ${msg}`);
        testPassed++;
      } else {
        console.error(`  ❌ FAIL: ${msg}`);
        testFailed++;
      }
    };

    const request = async (path, options = {}) => {
      const res = await fetch(`http://localhost:${PORT}${path}`, {
        headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
        ...options
      });
      const data = await res.json().catch(() => ({}));
      return { status: res.status, ok: res.ok, data };
    };

    console.log('\n--- 1. Testing Health & Public Config ---');
    const health = await request('/api/health');
    assert(health.ok && health.data.status === 'ok', 'GET /api/health responds with 200 OK');

    const config = await request('/api/auth/config');
    assert(config.ok && Array.isArray(config.data.authModes), 'GET /api/auth/config exposes auth capabilities');

    console.log('\n--- 2. Testing Local Registration ---');
    const regRes = await request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Alice Architect',
        email: 'alice@syncspace.io',
        password: 'securePassword123'
      })
    });
    assert(regRes.status === 201 && regRes.data.token, 'POST /api/auth/register creates user and returns JWT');
    const aliceToken = regRes.data.token;

    // Test duplicate registration error
    const dupRes = await request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Alice Duplicate',
        email: 'alice@syncspace.io',
        password: 'someOtherPassword'
      })
    });
    assert(dupRes.status === 409, 'Duplicate email registration returns 409 Conflict');

    console.log('\n--- 3. Testing Local Login ---');
    const loginRes = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'alice@syncspace.io',
        password: 'securePassword123'
      })
    });
    assert(loginRes.status === 200 && loginRes.data.token, 'POST /api/auth/login successfully logs in user with valid password');

    const badLogin = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'alice@syncspace.io',
        password: 'wrongPassword!'
      })
    });
    assert(badLogin.status === 401, 'POST /api/auth/login rejects incorrect password with 401');

    console.log('\n--- 4. Testing Protected Profile /api/auth/me ---');
    const meRes = await request('/api/auth/me', {
      headers: { Authorization: `Bearer ${aliceToken}` }
    });
    assert(meRes.status === 200 && meRes.data.user.email === 'alice@syncspace.io', 'GET /api/auth/me authenticates with JWT');

    const unauthMe = await request('/api/auth/me');
    assert(unauthMe.status === 401, 'GET /api/auth/me without token returns 401 Unauthorized');

    console.log('\n--- 5. Testing Sign In with Google ---');
    // Test Google Sign-In with Demo / Sandbox Profile
    const googleRes = await request('/api/auth/google', {
      method: 'POST',
      body: JSON.stringify({
        demoProfile: {
          id: 'google_sub_1029384756',
          email: 'bob.google@syncspace.io',
          name: 'Bob Google Engineer',
          avatar: 'https://lh3.googleusercontent.com/a/default-avatar'
        }
      })
    });
    assert(googleRes.status === 200 && googleRes.data.token, 'POST /api/auth/google creates and authenticates new Google user');
    assert(googleRes.data.user.provider === 'google', 'User provider is set to google');

    // Test Google Sign-In Account Linking with existing local user (Alice)
    const linkRes = await request('/api/auth/google', {
      method: 'POST',
      body: JSON.stringify({
        demoProfile: {
          id: 'google_sub_alice_linked',
          email: 'alice@syncspace.io',
          name: 'Alice Architect (Google)',
          avatar: 'https://lh3.googleusercontent.com/a/alice-avatar'
        }
      })
    });
    assert(linkRes.status === 200 && linkRes.data.user.email === 'alice@syncspace.io', 'POST /api/auth/google links existing account seamlessly');

    console.log(`\n========================================`);
    console.log(`TEST SUMMARY: ${testPassed} Passed, ${testFailed} Failed`);
    console.log(`========================================\n`);

    server.close(() => {
      process.exit(testFailed > 0 ? 1 : 0);
    });
  } catch (err) {
    console.error('Test execution error:', err);
    server.close(() => process.exit(1));
  }
});
