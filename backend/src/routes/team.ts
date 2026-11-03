import express from 'express';
import {
  listPublicTeamMembers,
  listTeamMembersAdmin,
  getTeamMemberAdmin,
  createTeamMemberAdmin,
  updateTeamMemberAdmin,
  reorderTeamMembersAdmin,
  deleteTeamMemberAdmin,
} from '../controllers/teamMemberController';
import { authenticateToken } from '../middleware/auth';
import { requirePermission } from '../access/middleware';
import {
  validateRequest,
  createTeamMemberSchema,
  updateTeamMemberSchema,
  reorderTeamMembersSchema,
} from '../middleware/validation';
import { uploadProfileImage } from '../config/multer.config';
import multer from 'multer';

const router = express.Router();

// The public "Our admins and staff" section of the team page. These are public
// profiles, not login accounts: adding one here grants no dashboard access.

// ── Public ────────────────────────────────────────────────────────────────────
router.get('/', listPublicTeamMembers);

// ── Admin (super-admin, or staff whose role has team.manage) ─────────────────
router.use(authenticateToken, requirePermission('team.manage'));

// Static paths first, so they are not read as a member id
router.get('/admin/all', listTeamMembersAdmin);
router.put('/order', validateRequest(reorderTeamMembersSchema), reorderTeamMembersAdmin);

// The upload stores the photo in Cloudinary; a refused file is deleted again
const photoUpload: express.RequestHandler = (req, res, next) => {
  uploadProfileImage.single('image')(req, res, (err: unknown) => {
    if (!err) return next();
    const httpCode = (err as { http_code?: number })?.http_code;
    if (err instanceof multer.MulterError) {
      const message = err.code === 'LIMIT_FILE_SIZE' ? 'The photo must be 5 MB or smaller' : err.message;
      return res.status(400).json({ status: 400, message });
    }
    if (err instanceof Error && (err.message === 'Only image files are allowed' || httpCode === 400)) {
      return res.status(400).json({ status: 400, message: err.message });
    }
    console.error('Team member photo upload error:', err);
    res.status(502).json({ status: 502, message: 'The photo could not be uploaded. Please try again.' });
  });
};
router.post('/upload/photo', photoUpload, (req, res) => {
  const file = req.file as Express.Multer.File & { path?: string };
  if (!file) return res.status(400).json({ status: 400, message: 'No file uploaded' });
  res.json({ status: 200, message: 'Image uploaded', url: file.path });
});

router.get('/admin/:memberId', getTeamMemberAdmin);
router.post('/', validateRequest(createTeamMemberSchema), createTeamMemberAdmin);
router.patch('/:memberId', validateRequest(updateTeamMemberSchema), updateTeamMemberAdmin);
router.delete('/:memberId', deleteTeamMemberAdmin);

export default router;