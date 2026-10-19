import express from 'express';
import { submitContactMessage } from '../controllers/contactController';
import { validateRequest, contactMessageSchema } from '../middleware/validation';

const router = express.Router();

// Public Contact page form (rate limited in server.ts)
router.post('/', validateRequest(contactMessageSchema), submitContactMessage);

export default router;
