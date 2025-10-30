import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import User from '../models/User.js';
import wfhRequestSchema from '../models/WfhRequest.js';

const router = express.Router();

function getWeekRange() {
  const today = new Date();

  // Find Monday of the current week
  const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday
  const diffToMonday = today.getDate() - currentDay + (currentDay === 0 ? -6 : 1);

  const monday = new Date(today.setDate(diffToMonday));
  monday.setHours(0, 0, 0, 0);

  // End = Sunday of next week (13 days after Monday)
  const end = new Date(monday);
  end.setDate(monday.getDate() + 13);
  end.setHours(23, 59, 59, 999);

  return { start: monday, end };
}

router.get('/', protect, async (req, res) => {
 

  try {
    const { start, end } = getWeekRange();

    const users = await User.find().select('name email');

    const requests = await wfhRequestSchema.find({
      status: { $in: ['approved', 'pending'] },
      date: { $gte: start, $lte: end }
    }).populate('user', 'name email role');

    res.json({ users, requests });
  } catch (err) {
    console.error('[CALENDAR] Error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
