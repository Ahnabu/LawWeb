import express from 'express';
import {
  listBlogs,
  getBlogById,
  getBlogBySlug,
  createBlog,
  updateBlog,
  deleteBlog,
} from '../controllers/blogController';
import { authenticateToken, authorizeRoles } from '../middleware/auth';
import { uploadBlogCover } from '../config/multer.config';

const router = express.Router();

// ── Public routes ─────────────────────────────────────────────────────────────
router.get('/', listBlogs);
router.get('/slug/:slug', getBlogBySlug);

// ── Admin-only routes ─────────────────────────────────────────────────────────
router.use(authenticateToken, authorizeRoles('admin'));

router.get('/admin/all', listBlogs);
router.get('/admin/:blogId', getBlogById);
router.post('/', createBlog);
router.patch('/:blogId', updateBlog);
router.delete('/:blogId', deleteBlog);

// Cover image upload → returns { url }
router.post('/upload/cover', uploadBlogCover.single('cover'), (req, res) => {
  const file = req.file as Express.Multer.File & { path?: string };
  if (!file) return res.status(400).json({ status: 400, message: 'No file uploaded' });
  res.json({ status: 200, message: 'Image uploaded', url: file.path });
});

export default router;
