import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Middleware to protect routes and verify JWT token
// This middleware checks if the request has a valid JWT token in the Authorization header
export const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

     // ✅ Print decoded token info
    console.log('Decoded token payload:', decoded);

    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    } else if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    return res.status(500).json({ message: 'Something went wrong' });
  }
};

// Middleware to check if the user is an admin or approver
export const adminOnly = (req, res, next) => {
   if (req.user && ['admin', 'approver'].includes(req.user.role)) {
    next();
  } else {
    res.status(403).json({ message: 'Access denied. Admins or Approvers only.' });
  }
};
