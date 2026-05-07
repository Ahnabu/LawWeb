import express from 'express';
import {
  getAdminStats,
  getAllCasesAdmin,
  getAllConsultationsAdmin,
  getAllLawyersAdmin,
  getAllClientsAdmin,
  toggleLawyerVerification,
} from '../controllers/adminController';
import { authenticateToken, authorizeRoles } from '../middleware/auth';

const router = express.Router();

// All admin routes require authentication and admin role
router.use(authenticateToken, authorizeRoles('admin'));

router.get('/stats', getAdminStats);
router.get('/cases', getAllCasesAdmin);
router.get('/consultations', getAllConsultationsAdmin);
router.get('/lawyers', getAllLawyersAdmin);
router.get('/clients', getAllClientsAdmin);
router.patch('/lawyers/:lawyerId/toggle-verification', toggleLawyerVerification);

export default router;
