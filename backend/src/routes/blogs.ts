import express from 'express';
import {
  listBlogs,
  getBlogById,
  getBlogBySlug,
  createBlog,
  updateBlog,
  deleteBlog,
} from '../controllers/blogController';
import { authenticateToken } from '../middleware/auth';
import { requirePermission } from '../access/middleware';
import { uploadBlogCover } from '../config/multer.config';
import { recordAudit } from '../utils/audit';

const router = express.Router();

// ── Public routes ─────────────────────────────────────────────────────────────
router.get('/', listBlogs);
router.get('/slug/:slug', getBlogBySlug);

// ── Blog management (super-admin, or staff whose role has blogs.manage) ───────
router.use(authenticateToken, requirePermission('blogs.manage'));

router.get('/admin/all', listBlogs);
router.get('/admin/:blogId', getBlogById);
router.post('/', createBlog);
router.patch('/:blogId', updateBlog);
router.delete('/:blogId', deleteBlog);

// Cover image upload → returns { url }
router.post('/upload/cover', uploadBlogCover.single('cover'), (req, res) => {
  const file = req.file as Express.Multer.File & { path?: string };
  if (!file) return res.status(400).json({ status: 400, message: 'No file uploaded' });
  recordAudit(req, {
    action: 'blog.cover_uploaded',
    category: 'blog',
    targetType: 'image',
    summary: 'Uploaded a blog cover image',
    metadata: { url: file.path },
  });
  res.json({ status: 200, message: 'Image uploaded', url: file.path });
});

export default router;
