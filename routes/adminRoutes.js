import express from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import WfhRequest from '../models/WfhRequest.js'; 
import { protect, adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get all users (admin only)
router.get('/users', protect, adminOnly, async (req, res) => {
  const users = await User.find().select('-password'); // Fetch all users excluding passwords
  res.json(users);
});

// Delete a user
router.delete('/users/:id', protect, adminOnly, async (req, res) => {
  try {
    const userId = req.params.id;

    // Prevent admin from deleting themselves
    if (req.user._id.toString() === userId) {
      return res.status(400).json({ message: "You cannot delete your own account." });
    }

    // First, delete all WFH requests by this user
    await WfhRequest.deleteMany({ user: userId });

    // Then delete the user
    const user = await User.findByIdAndDelete(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({ message: 'User and related WFH requests deleted' });
  } catch (err) {
    console.error('Error deleting user:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user password
router.put('/users/:id/password', protect, adminOnly, async (req, res) => {
  const { password } = req.body;

  if (!password || password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters' });
  }

  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
