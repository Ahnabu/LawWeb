import express from 'express';
import { getMyProfile, updateMyProfile, uploadMyProfileImage } from '../controllers/userController';
import { authenticateToken } from '../middleware/auth';
import { uploadProfileImage as multerUpload } from '../config/multer.config';

const router = express.Router();

router.get('/me', authenticateToken, getMyProfile);
router.put('/me', authenticateToken, updateMyProfile);
router.post('/me/profile-image', authenticateToken, multerUpload.single('image'), uploadMyProfileImage);

export default router;
