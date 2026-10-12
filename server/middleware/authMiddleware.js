import jwt from 'jsonwebtoken';

export const JWT_SECRET = process.env.JWT_SECRET || 'syncspace_jwt_secret_2026';

export function generateToken(user) {
  const payload = {
    id: user.id || user._id,
    email: user.email,
    name: user.name,
    avatar: user.avatar || '',
    provider: user.provider || 'local'
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}

export function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'No authorization header provided' });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ error: 'Invalid token format. Expected "Bearer <token>"' });
  }

  const token = parts[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token has expired. Please sign in again.' });
    }
    return res.status(403).json({ error: 'Invalid or forged token.' });
  }
}

export function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      req.user = jwt.verify(token, JWT_SECRET);
    } catch {
      // Ignored for optional auth
    }
  }
  return next();
}
