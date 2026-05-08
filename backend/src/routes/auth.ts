import express from 'express';
import { register, login, logout, getProfile, refreshToken, verifyEmail, resendVerificationCode, changePassword } from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';
import { registerSchema, loginSchema, validateRequest } from '../middleware/validation';

const router = express.Router();

// Public routes
router.post('/register', validateRequest(registerSchema), register);
router.post('/login', validateRequest(loginSchema), login);
router.post('/refresh', refreshToken);
router.post('/verify-email', verifyEmail);
router.post('/resend-verification-code', resendVerificationCode);
router.post('/verify-code', verifyEmail);
router.post('/resend-code', resendVerificationCode);

// Protected routes
router.post('/logout', authenticateToken, logout);
router.get('/profile', authenticateToken, getProfile);
router.post('/change-password', authenticateToken, changePassword);

export default router;
