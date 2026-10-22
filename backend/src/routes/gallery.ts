import express from 'express';
import { listPublicGallery } from '../controllers/galleryController';

const router = express.Router();

// Public Gallery page. Managed under /api/admin/gallery (routes/admin.ts).
router.get('/', listPublicGallery);

export default router;
