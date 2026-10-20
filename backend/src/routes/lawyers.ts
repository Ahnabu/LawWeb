import express from 'express';
import {
  getAllLawyers,
  getPublicLawyers,
  getLawyerProfile,
  getMyAvailability,
  updateMyAvailability,
  getLawyerAvailabilityPublic,
  getLawyerSlotsPublic,
} from '../controllers/lawyerController';
import { getMyLawyerProfile, updateMyLawyerProfile, uploadProfileImage } from '../controllers/lawyerProfileController';
import { authenticateToken } from '../middleware/auth';
import { requireKind } from '../access/middleware';
import { uploadProfileImage as multerUpload } from '../config/multer.config';

const router = express.Router();

// Public routes (non-parameterized first)
router.get('/public', getPublicLawyers);
router.get('/', getAllLawyers);

// Protected lawyer-only routes — must be before /:lawyerId to prevent "me" being treated as an ObjectId
router.get('/me/availability', authenticateToken, requireKind('lawyer'), getMyAvailability);
router.put('/me/availability', authenticateToken, requireKind('lawyer'), updateMyAvailability);
router.get('/me/profile', authenticateToken, requireKind('lawyer'), getMyLawyerProfile);
router.put('/me/profile', authenticateToken, requireKind('lawyer'), updateMyLawyerProfile);
router.post('/me/profile/image', authenticateToken, requireKind('lawyer'), multerUpload.single('image'), uploadProfileImage);

// Parameterized public routes
router.get('/:lawyerId/availability', getLawyerAvailabilityPublic);
router.get('/:lawyerId/slots', getLawyerSlotsPublic);
router.get('/:lawyerId', getLawyerProfile);

export default router;
