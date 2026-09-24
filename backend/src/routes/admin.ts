import express from 'express';
import {
  getAdminStats,
  getAllCasesAdmin,
  createCaseAdmin,
  updateCaseAdmin,
  getAllConsultationsAdmin,
  updateConsultationStatusAdmin,
  getAllLawyersAdmin,
  addLawyerAdmin,
  deleteLawyerAdmin,
  getAllClientsAdmin,
  toggleLawyerVerification,
  getLawyerDetailsAdmin,
} from '../controllers/adminController';
import {
  listBlogs as getBlogs,
  getBlogById,
  createBlog,
  updateBlog,
  deleteBlog,
} from '../controllers/blogController';
import {
  listContentPages,
  getContentPageAdmin,
  saveContentDraft,
  publishContentPage,
  discardContentDraft,
  listContentRevisions,
  getContentRevision,
  restoreContentRevision,
} from '../controllers/contentController';
import { authenticateToken, authorizeRoles } from '../middleware/auth';
import {
  validateRequest,
  contentPageSchema,
  saveContentDraftSchema,
  contentRevisionSchema,
} from '../middleware/validation';
import { uploadContentImage } from '../config/multer.config';

const router = express.Router();

// All admin routes require authentication and admin role
router.use(authenticateToken, authorizeRoles('admin'));

router.get('/stats', getAdminStats);

// Cases
router.get('/cases', getAllCasesAdmin);
router.post('/cases', createCaseAdmin);
router.patch('/cases/:caseId', updateCaseAdmin);

// Consultations/Appointments
router.get('/consultations', getAllConsultationsAdmin);
router.patch('/consultations/:consultationId/status', updateConsultationStatusAdmin);

// Lawyers
router.get('/lawyers', getAllLawyersAdmin);
router.post('/lawyers', addLawyerAdmin);
router.get('/lawyers/:lawyerId', getLawyerDetailsAdmin);
router.delete('/lawyers/:lawyerId', deleteLawyerAdmin);
router.patch('/lawyers/:lawyerId/toggle-verification', toggleLawyerVerification);

// Clients/Users
router.get('/clients', getAllClientsAdmin);

// ── Blogs ─────────────────────────────────────────────────────────────────────
router.get("/blogs", getBlogs);
router.post("/blogs", createBlog);
router.get("/blogs/:blogId", getBlogById);
router.patch("/blogs/:blogId", updateBlog);
router.delete("/blogs/:blogId", deleteBlog);
// Publish shortcut — sets status to 'published'
router.patch("/blogs/:blogId/publish", (req, res, next) => {
  req.body = { ...req.body, status: 'published' };
  next();
}, updateBlog);

// ── Content (CMS) ─────────────────────────────────────────────────────────────
// Image upload → returns { url }. Declared before /:pageKey routes.
router.post('/content/upload', uploadContentImage.single('image'), (req, res) => {
  const file = req.file as Express.Multer.File & { path?: string };
  if (!file) return res.status(400).json({ status: 400, message: 'No file uploaded' });
  res.json({ status: 200, message: 'Image uploaded', url: file.path });
});
router.get('/content', listContentPages);
router.get('/content/:pageKey', validateRequest(contentPageSchema), getContentPageAdmin);
router.put('/content/:pageKey', validateRequest(saveContentDraftSchema), saveContentDraft);
router.post('/content/:pageKey/publish', validateRequest(contentPageSchema), publishContentPage);
router.post('/content/:pageKey/discard', validateRequest(contentPageSchema), discardContentDraft);
router.get('/content/:pageKey/revisions', validateRequest(contentPageSchema), listContentRevisions);
router.get('/content/:pageKey/revisions/:version', validateRequest(contentRevisionSchema), getContentRevision);
router.post('/content/:pageKey/revisions/:version/restore', validateRequest(contentRevisionSchema), restoreContentRevision);

export default router;
