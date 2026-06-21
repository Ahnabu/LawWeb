import express from 'express';
import {
  bookConsultation,
  getMyConsultations,
  cancelConsultation,
  updateConsultationStatus,
  confirmConsultation,
  getNotifications,
} from '../controllers/consultationController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

router.post('/book', authenticateToken, bookConsultation);
router.get('/my-consultations', authenticateToken, getMyConsultations);
router.get('/notifications', authenticateToken, getNotifications);
router.post('/:consultationId/cancel', authenticateToken, cancelConsultation);
router.put('/:consultationId/status', authenticateToken, updateConsultationStatus);
router.put('/:consultationId/confirm', authenticateToken, confirmConsultation);

export default router;
