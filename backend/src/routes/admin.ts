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
import { authenticateToken, authorizeRoles } from '../middleware/auth';

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

export default router;
