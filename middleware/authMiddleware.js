import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Middleware to protect routes and verify JWT token
// This middleware checks if the request has a valid JWT token in the Authorization header
export const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization; // Extract the Authorization header from the request

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }

  try {
    const token = authHeader.split(' ')[1]; // Extract the token from the header
   
    const decoded = jwt.verify(token, process.env.JWT_SECRET); // Verify the token using the secret key
    
    const user = await User.findById(decoded.userId).select('-password'); // Find the user by ID from the decoded token and exclude the password field
     if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    req.user = user; // Attach the user to the request object

    next(); // Proceed to the next middleware or route handler
  } catch (err) {
   
    res.status(401).json({ message: 'Not authorized, invalid token' });
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
