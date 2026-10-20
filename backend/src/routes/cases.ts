import express from 'express';
import { createCase, getMyCases, getCaseById, updateCase, deleteCase, toggleFeaturedCase, trackCasePublic, archiveMyCase, restoreMyCase } from '../controllers/caseController';
import { authenticateToken } from '../middleware/auth';
import { requireKind, requireSuperAdmin } from '../access/middleware';

const router = express.Router();

// The account-type gate keeps clients' old 403 body; which lawyer's cases an
// actor may create, feature or edit is decided per case in the controller
router.post('/', authenticateToken, requireKind('admin', 'lawyer'), createCase);
router.get('/my-cases', authenticateToken, getMyCases);
// Public case tracking - must be before /:caseId to avoid conflict
router.get('/track', trackCasePublic);
router.get('/:caseId', authenticateToken, getCaseById);
router.patch('/:caseId', authenticateToken, updateCase);
router.patch('/:caseId/toggle-featured', authenticateToken, requireKind('admin', 'lawyer'), toggleFeaturedCase);
router.patch('/:caseId/archive', authenticateToken, requireKind('lawyer'), archiveMyCase);
router.patch('/:caseId/restore', authenticateToken, requireKind('lawyer'), restoreMyCase);
router.delete('/:caseId', authenticateToken, requireSuperAdmin, deleteCase);

export default router;
