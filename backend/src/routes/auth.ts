import express from 'express';
import {
  register,
  login,
  logout,
  getProfile,
  refreshToken,
  verifyEmail,
  resendVerificationCode,
  changePassword,
  forgotPassword,
  resetPassword,
} from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';
import {
  registerSchema,
  loginSchema,
  emailOnlySchema,
  verifyEmailSchema,
  resetPasswordSchema,
  changePasswordSchema,
  validateRequest,
} from '../middleware/validation';

const router = express.Router();

// Public routes (rate limited in server.ts)
router.post('/register', validateRequest(registerSchema), register);
router.post('/login', validateRequest(loginSchema), login);
router.post('/refresh', refreshToken);
// Works with an expired access token so a stale session can always sign out
router.post('/logout', logout);
router.post('/verify-email', validateRequest(verifyEmailSchema), verifyEmail);
router.post('/resend-verification-code', validateRequest(emailOnlySchema), resendVerificationCode);
router.post('/forgot-password', validateRequest(emailOnlySchema), forgotPassword);
router.post('/reset-password', validateRequest(resetPasswordSchema), resetPassword);

// Protected routes
router.get('/profile', authenticateToken, getProfile);
router.post('/change-password', authenticateToken, validateRequest(changePasswordSchema), changePassword);

export default router;
