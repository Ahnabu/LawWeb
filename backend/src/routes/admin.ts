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
import { listRolesAdmin, createRoleAdmin, updateRoleAdmin, deleteRoleAdmin } from '../controllers/roleController';
import {
  listStaffAdmin,
  createStaffAdmin,
  getStaffDetailsAdmin,
  updateStaffAdmin,
  blockStaffAdmin,
  unblockStaffAdmin,
  deleteStaffAdmin,
  grantDelegationAdmin,
  updateDelegationAdmin,
  revokeDelegationAdmin,
} from '../controllers/staffController';
import { authenticateToken } from '../middleware/auth';
import { requireAnyPermission, requireKind, requirePermission, requireSuperAdmin } from '../access/middleware';
import {
  validateRequest,
  contentPageSchema,
  saveContentDraftSchema,
  contentRevisionSchema,
  auditLogListSchema,
  createRoleSchema,
  updateRoleSchema,
  createStaffSchema,
  updateStaffSchema,
  grantDelegationSchema,
  updateDelegationSchema,
} from '../middleware/validation';
import { uploadContentImage } from '../config/multer.config';
import { recordAudit } from '../utils/audit';

const router = express.Router();

// The admin area is for the super-admin and staff; each route group then needs
// its own firm permission (a staff member's role, docs/rbac/README.md §3).
router.use(authenticateToken, requireKind('admin', 'staff'));

router.get('/stats', requirePermission('dashboard.stats'), getAdminStats);

// Cases. Field-level rules (finance, confidential, reassigning) are in the handlers.
router.get('/cases', requirePermission('cases.view'), getAllCasesAdmin);
router.post('/cases', requirePermission('cases.create'), createCaseAdmin);
router.patch('/cases/:caseId', requireAnyPermission('cases.edit', 'cases.finance.edit', 'cases.confidential.edit'), updateCaseAdmin);
router.patch('/cases/:caseId/archive', requirePermission('cases.archive'), archiveCaseAdmin);
router.patch('/cases/:caseId/restore', requirePermission('cases.archive'), restoreCaseAdmin);
router.delete('/cases/:caseId', requireSuperAdmin, deleteCaseAdmin);

// Consultations/Appointments
router.get('/consultations', requirePermission('appointments.view'), getAllConsultationsAdmin);
router.patch('/consultations/:consultationId/status', requirePermission('appointments.manage'), updateConsultationStatusAdmin);

// Lawyers
const lawyersView = requirePermission('lawyers.view');
const lawyersManage = requirePermission('lawyers.manage');
router.get('/lawyers', lawyersView, getAllLawyersAdmin);
router.post('/lawyers', lawyersManage, addLawyerAdmin);
// Static path before /:lawyerId
router.put('/lawyers/order', lawyersManage, reorderLawyersAdmin);
router.get('/lawyers/:lawyerId', lawyersView, getLawyerDetailsAdmin);
router.patch('/lawyers/:lawyerId', lawyersManage, updateLawyerAdmin);
router.get('/lawyers/:lawyerId/deletion-impact', lawyersView, getLawyerDeletionImpactAdmin);
router.delete('/lawyers/:lawyerId', lawyersManage, deleteLawyerAdmin);
router.patch('/lawyers/:lawyerId/restore', lawyersManage, restoreLawyerAdmin);
router.patch('/lawyers/:lawyerId/toggle-verification', lawyersManage, toggleLawyerVerification);

// Clients/Users. Lawyer and staff targets need more than clients.*; see the handlers.
const clientsView = requirePermission('clients.view');
const clientsManage = requirePermission('clients.manage');
router.get('/clients', clientsView, getAllClientsAdmin);
router.get('/users', clientsView, listUsersAdmin);
router.get('/users/:userId', clientsView, getUserDetailsAdmin);
router.patch('/users/:userId', clientsManage, updateUserAdmin);
router.patch('/users/:userId/block', clientsManage, blockUserAdmin);
router.patch('/users/:userId/unblock', clientsManage, unblockUserAdmin);
router.delete('/users/:userId', clientsManage, deleteUserAdmin);

// ── Roles and staff (super-admin only; no permission grants these) ────────────
router.get('/roles', requireSuperAdmin, listRolesAdmin);
router.post('/roles', requireSuperAdmin, validateRequest(createRoleSchema), createRoleAdmin);
router.patch('/roles/:roleId', requireSuperAdmin, validateRequest(updateRoleSchema), updateRoleAdmin);
router.delete('/roles/:roleId', requireSuperAdmin, deleteRoleAdmin);

router.get('/staff', requireSuperAdmin, listStaffAdmin);
router.post('/staff', requireSuperAdmin, validateRequest(createStaffSchema), createStaffAdmin);
router.get('/staff/:staffId', requireSuperAdmin, getStaffDetailsAdmin);
router.patch('/staff/:staffId', requireSuperAdmin, validateRequest(updateStaffSchema), updateStaffAdmin);
router.patch('/staff/:staffId/block', requireSuperAdmin, blockStaffAdmin);
router.patch('/staff/:staffId/unblock', requireSuperAdmin, unblockStaffAdmin);
router.delete('/staff/:staffId', requireSuperAdmin, deleteStaffAdmin);
// Lawyers a staff member assists (a lawyer manages their own from /api/workspace/me/team)
router.post('/staff/:staffId/delegations', requireSuperAdmin, validateRequest(grantDelegationSchema), grantDelegationAdmin);
router.patch('/staff/:staffId/delegations/:lawyerId', requireSuperAdmin, validateRequest(updateDelegationSchema), updateDelegationAdmin);
router.delete('/staff/:staffId/delegations/:lawyerId', requireSuperAdmin, revokeDelegationAdmin);

// ── Blogs ─────────────────────────────────────────────────────────────────────
// Also served under /api/blogs (routes/blogs.ts, which the admin page uses)
const blogsManage = requirePermission('blogs.manage');
router.get("/blogs", blogsManage, getBlogs);
router.post("/blogs", blogsManage, createBlog);
router.get("/blogs/:blogId", blogsManage, getBlogById);
router.patch("/blogs/:blogId", blogsManage, updateBlog);
router.delete("/blogs/:blogId", blogsManage, deleteBlog);
// Publish shortcut — sets status to 'published'
router.patch("/blogs/:blogId/publish", blogsManage, (req, res, next) => {
  req.body = { ...req.body, status: 'published' };
  next();
}, updateBlog);

// ── Contact messages ──────────────────────────────────────────────────────────
const messagesManage = requirePermission('messages.manage');
router.get('/messages', messagesManage, listContactMessagesAdmin);
router.patch('/messages/:messageId', messagesManage, updateContactMessageAdmin);
router.delete('/messages/:messageId', messagesManage, deleteContactMessageAdmin);

// ── Audit logs ────────────────────────────────────────────────────────────────
const auditView = requirePermission('audit.view');
router.get('/audit-logs/meta', auditView, getAuditLogMetaAdmin);
router.get('/audit-logs', auditView, validateRequest(auditLogListSchema), listAuditLogsAdmin);

// ── Content (CMS) ─────────────────────────────────────────────────────────────
const contentEdit = requirePermission('content.edit');
const contentPublish = requirePermission('content.publish');
// Image upload → returns { url }. Declared before /:pageKey routes.
router.post('/content/upload', contentEdit, uploadContentImage.single('image'), (req, res) => {
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
router.get('/content', contentEdit, listContentPages);
router.get('/content/:pageKey', contentEdit, validateRequest(contentPageSchema), getContentPageAdmin);
router.put('/content/:pageKey', contentEdit, validateRequest(saveContentDraftSchema), saveContentDraft);
router.post('/content/:pageKey/publish', contentPublish, validateRequest(contentPageSchema), publishContentPage);
router.post('/content/:pageKey/discard', contentPublish, validateRequest(contentPageSchema), discardContentDraft);
router.get('/content/:pageKey/revisions', contentEdit, validateRequest(contentPageSchema), listContentRevisions);
router.get('/content/:pageKey/revisions/:version', contentEdit, validateRequest(contentRevisionSchema), getContentRevision);
router.post('/content/:pageKey/revisions/:version/restore', contentPublish, validateRequest(contentRevisionSchema), restoreContentRevision);

export default router;
