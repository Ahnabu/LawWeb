import express from 'express';
import { createCase, getMyCases, getCaseById, updateCase, deleteCase } from '../controllers/caseController';
import { authenticateToken, authorizeRoles } from '../middleware/auth';

const router = express.Router();

router.post('/', authenticateToken, authorizeRoles('admin'), createCase);
router.get('/my-cases', authenticateToken, getMyCases);
router.get('/:caseId', authenticateToken, getCaseById);
router.patch('/:caseId', authenticateToken, updateCase);
router.delete('/:caseId', authenticateToken, authorizeRoles('admin'), deleteCase);

export default router;
