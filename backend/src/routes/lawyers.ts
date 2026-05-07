import express from 'express';
import {
  getAllLawyers,
  getLawyerProfile,
  getMyAvailability,
  updateMyAvailability,
  getLawyerAvailabilityPublic,
} from '../controllers/lawyerController';
import { authenticateToken, authorizeRoles } from '../middleware/auth';

const router = express.Router();

// Public routes
router.get('/', getAllLawyers);
router.get('/:lawyerId/availability', getLawyerAvailabilityPublic);
router.get('/:lawyerId', getLawyerProfile);

// Protected lawyer-only routes
router.get('/me/availability', authenticateToken, authorizeRoles('lawyer'), getMyAvailability);
router.put('/me/availability', authenticateToken, authorizeRoles('lawyer'), updateMyAvailability);

export default router;
