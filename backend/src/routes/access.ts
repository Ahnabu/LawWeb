import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { requireKind } from '../access/middleware';
import { PERMISSIONS, LAWYER_SCOPED } from '../access/permissions';
import { ROLE_TEMPLATES } from '../access/roleTemplates';

const router = express.Router();

// The permission catalog for the Roles page (and, in Phase 3, the lawyer's
// "My Team" checkboxes). Clients have no use for it.
router.get('/catalog', authenticateToken, requireKind('admin', 'staff', 'lawyer'), (_req, res) => {
  res.json({
    status: 200,
    message: 'Permission catalog',
    data: {
      permissions: PERMISSIONS.map((p) => ({ ...p, implies: 'implies' in p ? p.implies : [] })),
      templates: ROLE_TEMPLATES,
      // What a lawyer may hand to an assistant (Phase 3)
      delegable: [...LAWYER_SCOPED],
    },
  });
});

export default router;
