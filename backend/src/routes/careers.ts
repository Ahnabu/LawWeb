import express from 'express';
import {
  listPublicCareers,
  listCareerDepartments,
  getPublicCareer,
  listCareersAdmin,
  getCareerAdmin,
  createCareerAdmin,
  updateCareerAdmin,
  deleteCareerAdmin,
} from '../controllers/careerController';
import { authenticateToken } from '../middleware/auth';
import { requirePermission } from '../access/middleware';
import { validateRequest, createCareerSchema, updateCareerSchema } from '../middleware/validation';

const router = express.Router();

// Career openings. The admin posts them from the dashboard; the public Careers
// page lists the published ones and shows the details as formatted text.

// ── Public ────────────────────────────────────────────────────────────────────
router.get('/', listPublicCareers);
router.get('/departments', listCareerDepartments);
router.get('/slug/:slug', getPublicCareer);

// ── Admin (super-admin, or staff whose role has careers.manage) ──────────────
router.use(authenticateToken, requirePermission('careers.manage'));

// Static path first, so it is not read as an opening id
router.get('/admin/all', listCareersAdmin);

router.get('/admin/:careerId', getCareerAdmin);
router.post('/', validateRequest(createCareerSchema), createCareerAdmin);
router.patch('/:careerId', validateRequest(updateCareerSchema), updateCareerAdmin);
router.delete('/:careerId', deleteCareerAdmin);

export default router;