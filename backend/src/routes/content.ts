import express from 'express';
import { getPublishedContent, getPublishedPage } from '../controllers/contentController';

const router = express.Router();

// ── Public routes (published content only) ──────────────────────────────────
router.get('/', getPublishedContent);
router.get('/:pageKey', getPublishedPage);

export default router;
