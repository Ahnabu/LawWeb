import express from 'express';
import {
  getAllLawyers,
  getPublicLawyers,
  getLawyerProfile,
  getLawyerAvailabilityPublic,
  getLawyerSlotsPublic,
} from '../controllers/lawyerController';

const router = express.Router();

// Public routes (non-parameterized first)
router.get('/public', getPublicLawyers);
router.get('/', getAllLawyers);

// A lawyer's own availability and profile are under /api/workspace/me (routes/workspace.ts)

// Parameterized public routes
router.get('/:lawyerId/availability', getLawyerAvailabilityPublic);
router.get('/:lawyerId/slots', getLawyerSlotsPublic);
router.get('/:lawyerId', getLawyerProfile);

export default router;
