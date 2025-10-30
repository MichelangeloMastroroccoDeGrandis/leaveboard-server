import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
    requestWfh,
    getPendingRequests,
    approveRequest,
    getApprovedRequests,
    rejectRequest,
    deleteRequest,
    updateRequestDate
} from '../controllers/wfhController.js';

const router = express.Router();

router.use((req, res, next) => {
  console.log(`[WFH ROUTES] ${req.method} ${req.originalUrl}`);
  next();
});

// POST new WFH request
router.post('/request', protect, requestWfh);

// Approve / Reject
router.post('/approvals/:id/approve', protect, approveRequest);
router.post('/approvals/:id/reject', protect, rejectRequest);

// ---- IMPORTANT: specific routes first ----
// Update & Delete approved requests
router.put('/approved/:id/date', protect, updateRequestDate);
router.delete('/approved/:id', protect, deleteRequest);

// GET requests
router.get('/approvals', protect, getPendingRequests); // pending
router.get('/approved', protect, getApprovedRequests); // approved

export default router;
