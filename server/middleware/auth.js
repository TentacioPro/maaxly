import jwt from 'jsonwebtoken'
import User from '../models/User.js'

// Simple JWT-based auth middleware used by Express routes.
// Mirrors the logic used inline in server/index.js so other modules can import it.
export function authMiddleware(req, res, next) {
  const auth = req.headers && req.headers.authorization
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing token' })
  }
  const token = auth.slice(7)
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret')
    req.userId = payload.sub
    return next()
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' })
  }
}

// adminRequired: reuse authMiddleware to set req.userId then check isAdmin flag on User
export function adminRequired(req, res, next) {
  authMiddleware(req, res, async () => {
    try {
      const requester = await User.findById(req.userId).select('isAdmin')
      if (!requester) return res.status(401).json({ message: 'Unauthorized' })
      if (requester.isAdmin !== true) return res.status(403).json({ message: 'Forbidden: admin only' })
      return next()
    } catch (err) {
      return res.status(500).json({ message: 'Server error' })
    }
  })
}

export default { authMiddleware, adminRequired }
