import express from 'express';
import { createCase, getMyCases, getCaseById, updateCase, deleteCase, toggleFeaturedCase, trackCasePublic } from '../controllers/caseController';
import { authenticateToken, authorizeRoles } from '../middleware/auth';

const router = express.Router();

router.post('/', authenticateToken, authorizeRoles('admin', 'lawyer'), createCase);
router.get('/my-cases', authenticateToken, getMyCases);
// Public case tracking - must be before /:caseId to avoid conflict
router.get('/track/:query', trackCasePublic);
router.get('/:caseId', authenticateToken, getCaseById);
router.patch('/:caseId', authenticateToken, updateCase);
router.patch('/:caseId/toggle-featured', authenticateToken, authorizeRoles('admin', 'lawyer'), toggleFeaturedCase);
router.delete('/:caseId', authenticateToken, authorizeRoles('admin'), deleteCase);

export default router;
