import express from 'express';
import {
  getAllLawyers,
  getPublicLawyers,
  getLawyerProfile,
  getMyAvailability,
  updateMyAvailability,
  getLawyerAvailabilityPublic,
} from '../controllers/lawyerController';
import { getMyLawyerProfile, updateMyLawyerProfile, uploadProfileImage } from '../controllers/lawyerProfileController';
import { authenticateToken, authorizeRoles } from '../middleware/auth';
import { uploadProfileImage as multerUpload } from '../config/multer.config';

const router = express.Router();

// Public routes (non-parameterized first)
router.get('/public', getPublicLawyers);
router.get('/', getAllLawyers);

// Protected lawyer-only routes — must be before /:lawyerId to prevent "me" being treated as an ObjectId
router.get('/me/availability', authenticateToken, authorizeRoles('lawyer'), getMyAvailability);
router.put('/me/availability', authenticateToken, authorizeRoles('lawyer'), updateMyAvailability);
router.get('/me/profile', authenticateToken, authorizeRoles('lawyer'), getMyLawyerProfile);
router.put('/me/profile', authenticateToken, authorizeRoles('lawyer'), updateMyLawyerProfile);
router.post('/me/profile/image', authenticateToken, authorizeRoles('lawyer'), multerUpload.single('image'), uploadProfileImage);

// Parameterized public routes
router.get('/:lawyerId/availability', getLawyerAvailabilityPublic);
router.get('/:lawyerId', getLawyerProfile);

export default router;
