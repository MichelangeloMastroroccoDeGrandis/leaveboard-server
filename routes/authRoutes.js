import express from 'express';
import { loginUser } from '../controllers/authController.js'; // ✅ correct import
import { protect, adminOnly } from '../middleware/authMiddleware.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import sendEmail from '../utils/sendEmail.js';

const router = express.Router();

// ✅ login route now calls the real controller
router.post('/login', loginUser);

// Admin creates user
router.post('/register', protect, adminOnly, async (req, res) => {
  const { name, email, password, role, position, team, office, country } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) return res.status(400).json({ message: 'User already exists' });

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await User.create({
    name,
    email,
    password: hashedPassword,
    role,
    position,
    team,
    office,
    country,
  });

  res.status(201).json({ message: 'User created successfully', user });
});

// Token refresh route
router.post('/refresh', (req, res) => {
  const token = req.cookies.refreshToken;

  if (!token) {
    return res.status(401).json({ message: 'No refresh token provided' });
  }

  jwt.verify(token, process.env.JWT_REFRESH_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid refresh token' });
    }

    const accessToken = jwt.sign(
      { userId: decoded.userId },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    return res.json({ token: accessToken });
  });
});

// Recover password route
router.post('/recover', async (req, res) => {
  const { email } = req.body;
  if(!email) return res.status(400).json({ message: 'Email is required' });

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // send email
    await sendEmail({
      to: 'micky@digithaigroup.com',
      subject: `Password Recovery for ${user.name}`,
      text: `User ${user.name} (${user.email}) requested a password reset.`
    });

    res.json({ message: 'Recovery request sent to admin' });
  } catch(err) {
    console.error('[AUTH] Error in recover route:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
