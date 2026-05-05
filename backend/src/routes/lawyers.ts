import express from 'express';
import { getAllLawyers, getLawyerProfile } from '../controllers/lawyerController';

const router = express.Router();

// Public routes - no authentication required
router.get('/', getAllLawyers);
router.get('/:lawyerId', getLawyerProfile);

export default router;
