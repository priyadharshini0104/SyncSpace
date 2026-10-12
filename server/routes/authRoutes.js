import express from 'express';
import { register, login, googleAuth, getMe, getAuthConfig } from '../controllers/authController.js';
import { authenticateJWT } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public auth endpoints
router.post('/register', register);
router.post('/login', login);
router.post('/google', googleAuth);
router.get('/config', getAuthConfig);

// Protected endpoints
router.get('/me', authenticateJWT, getMe);

export default router;
