import express from 'express';
import {
  bookConsultation,
  getMyConsultations,
  cancelConsultation,
  updateConsultationStatus,
} from '../controllers/consultationController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Protected routes - require authentication
router.post('/book', authenticateToken, bookConsultation);
router.get('/my-consultations', authenticateToken, getMyConsultations);
router.post('/:consultationId/cancel', authenticateToken, cancelConsultation);
router.put('/:consultationId/status', authenticateToken, updateConsultationStatus);

export default router;
