import express from 'express';
import { protect, adminOnly } from '../middleware/authMiddleware.js';
import { listHolidays, createHoliday, updateHoliday, deleteHoliday } from '../controllers/holidayController.js';

const router = express.Router();

router.use((req, res, next) => {
  console.log(`[HOLIDAYS ROUTES] ${req.method} ${req.originalUrl}`);
  next();
});

router.get('/', protect, listHolidays);
router.post('/', protect, adminOnly, createHoliday);
router.put('/:id', protect, adminOnly, updateHoliday);
router.delete('/:id', protect, adminOnly, deleteHoliday);

export default router;
