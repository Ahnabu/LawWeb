import express from 'express';
import {
  getAdminStats,
  getAllConsultationsAdmin,
  updateConsultationStatusAdmin,
} from '../controllers/adminController';
import {
  getAllCasesAdmin,
  createCaseAdmin,
  updateCaseAdmin,
  archiveCaseAdmin,
  restoreCaseAdmin,
  deleteCaseAdmin,
} from '../controllers/adminCaseController';
import {
  getAllLawyersAdmin,
  addLawyerAdmin,
  updateLawyerAdmin,
  reorderLawyersAdmin,
  getLawyerDeletionImpactAdmin,
  deleteLawyerAdmin,
  restoreLawyerAdmin,
  toggleLawyerVerification,
  getLawyerDetailsAdmin,
} from '../controllers/adminLawyerController';
import {
  getAllClientsAdmin,
  listUsersAdmin,
  getUserDetailsAdmin,
  updateUserAdmin,
  blockUserAdmin,
  unblockUserAdmin,
  deleteUserAdmin,
} from '../controllers/adminUserController';
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
import {
  listContactMessagesAdmin,
  updateContactMessageAdmin,
  deleteContactMessageAdmin,
} from '../controllers/contactController';
import { listAuditLogsAdmin, getAuditLogMetaAdmin } from '../controllers/auditLogController';
import { authenticateToken, authorizeRoles } from '../middleware/auth';
import {
  validateRequest,
  contentPageSchema,
  saveContentDraftSchema,
  contentRevisionSchema,
  auditLogListSchema,
} from '../middleware/validation';
import { uploadContentImage } from '../config/multer.config';
import { recordAudit } from '../utils/audit';

const router = express.Router();

// All admin routes require authentication and admin role
router.use(authenticateToken, authorizeRoles('admin'));

router.get('/stats', getAdminStats);

// Cases
router.get('/cases', getAllCasesAdmin);
router.post('/cases', createCaseAdmin);
router.patch('/cases/:caseId', updateCaseAdmin);
router.patch('/cases/:caseId/archive', archiveCaseAdmin);
router.patch('/cases/:caseId/restore', restoreCaseAdmin);
router.delete('/cases/:caseId', deleteCaseAdmin);

// Consultations/Appointments
router.get('/consultations', getAllConsultationsAdmin);
router.patch('/consultations/:consultationId/status', updateConsultationStatusAdmin);

// Lawyers
router.get('/lawyers', getAllLawyersAdmin);
router.post('/lawyers', addLawyerAdmin);
// Static path before /:lawyerId
router.put('/lawyers/order', reorderLawyersAdmin);
router.get('/lawyers/:lawyerId', getLawyerDetailsAdmin);
router.patch('/lawyers/:lawyerId', updateLawyerAdmin);
router.get('/lawyers/:lawyerId/deletion-impact', getLawyerDeletionImpactAdmin);
router.delete('/lawyers/:lawyerId', deleteLawyerAdmin);
router.patch('/lawyers/:lawyerId/restore', restoreLawyerAdmin);
router.patch('/lawyers/:lawyerId/toggle-verification', toggleLawyerVerification);

// Clients/Users
router.get('/clients', getAllClientsAdmin);
router.get('/users', listUsersAdmin);
router.get('/users/:userId', getUserDetailsAdmin);
router.patch('/users/:userId', updateUserAdmin);
router.patch('/users/:userId/block', blockUserAdmin);
router.patch('/users/:userId/unblock', unblockUserAdmin);
router.delete('/users/:userId', deleteUserAdmin);

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

// ── Contact messages ──────────────────────────────────────────────────────────
router.get('/messages', listContactMessagesAdmin);
router.patch('/messages/:messageId', updateContactMessageAdmin);
router.delete('/messages/:messageId', deleteContactMessageAdmin);

// ── Audit logs ────────────────────────────────────────────────────────────────
router.get('/audit-logs/meta', getAuditLogMetaAdmin);
router.get('/audit-logs', validateRequest(auditLogListSchema), listAuditLogsAdmin);

// ── Content (CMS) ─────────────────────────────────────────────────────────────
// Image upload → returns { url }. Declared before /:pageKey routes.
router.post('/content/upload', uploadContentImage.single('image'), (req, res) => {
  const file = req.file as Express.Multer.File & { path?: string };
  if (!file) return res.status(400).json({ status: 400, message: 'No file uploaded' });
  recordAudit(req, {
    action: 'content.image_uploaded',
    category: 'content',
    targetType: 'image',
    summary: 'Uploaded a CMS image',
    metadata: { url: file.path },
  });
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
