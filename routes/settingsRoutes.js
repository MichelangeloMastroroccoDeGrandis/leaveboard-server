import express from 'express';
import { protect, adminOnly } from '../middleware/authMiddleware.js';
import { getWfhSettings, updateWfhSettings } from '../controllers/settingsController.js';

const router = express.Router();

// All authenticated users can read WFH settings (for displaying rules)
router.get('/wfh', protect, getWfhSettings);

// Only admin/approver/superuser can update WFH settings
router.put('/wfh', protect, adminOnly, updateWfhSettings);

export default router;
