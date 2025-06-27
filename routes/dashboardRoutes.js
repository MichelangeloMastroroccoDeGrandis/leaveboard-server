import express from 'express';
import { protect } from '../middleware/authMiddleware.js';

// Protected Dashboard ensuring only authenticated users can access it

const router = express.Router();

// GET /api/dashboard protect is a middleware that checks if the user is authenticated
router.get('/', protect, (req, res) => {
    if (!req.user) {
    return res.status(401).json({ message: 'No user data found' }); 
  }
  
  res.json({
    message: `Welcome ${req.user.name}!`,
    role: req.user.role,
    email: req.user.email,
  });
});

export default router;
