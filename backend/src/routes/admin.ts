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
} from '../controllers/adminController';
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
router.delete('/lawyers/:lawyerId', deleteLawyerAdmin);
router.patch('/lawyers/:lawyerId/toggle-verification', toggleLawyerVerification);

// Clients/Users
router.get('/clients', getAllClientsAdmin);

export default router;
