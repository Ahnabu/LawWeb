import express from 'express';
import { register, login, logout, getProfile, refreshToken } from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';
import { registerSchema, loginSchema, validateRequest } from '../middleware/validation';

const router = express.Router();

// Public routes
router.post('/register', validateRequest(registerSchema), register);
router.post('/login', validateRequest(loginSchema), login);
router.post('/refresh', refreshToken);

// Protected routes
router.post('/logout', authenticateToken, logout);
router.get('/profile', authenticateToken, getProfile);

export default router;
