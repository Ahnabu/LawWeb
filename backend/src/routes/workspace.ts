import express, { NextFunction, Response } from 'express';
import mongoose from 'mongoose';
import rateLimit from 'express-rate-limit';
import User from '../models/User';
import { authenticateToken } from '../middleware/auth';
import { validateRequest, inviteAssistantSchema, updateDelegationSchema } from '../middleware/validation';
import { uploadProfileImage as multerUpload } from '../config/multer.config';
import { ACTIVE_LAWYER_FILTER } from '../access/loadAccess';
import { LAWYER_SCOPED, type Permission } from '../access/permissions';
import { can, forbidden } from '../access/policy';
import type { AuthedRequest } from '../access/types';
import {
  getWorkspaceCases,
  createWorkspaceCase,
  getWorkspaceConsultations,
  getWorkspaceAvailability,
  updateWorkspaceAvailability,
  getWorkspaceProfile,
  updateWorkspaceProfile,
  uploadWorkspaceProfileImage,
  getWorkspaceOverview,
} from '../controllers/workspaceController';
import { listTeam, inviteAssistant, updateAssistant, removeAssistant, listTeamActivity } from '../controllers/teamController';

// One lawyer's work: /api/workspace/:lawyerId, where 'me' is the signed-in
// lawyer. Lawyers open only their own; staff open a lawyer they assist (or any,
// with a firm role holding lawyer-scoped permissions). Anything else is 404, so
// nobody learns which lawyers or records exist (docs/rbac/README.md §4).

const router = express.Router({ mergeParams: true });

const notFound = (res: Response) => res.status(404).json({ status: 404, message: 'Not found' });

export const resolveWorkspace = async (req: AuthedRequest, res: Response, next: NextFunction) => {
  try {
    const access = req.access!;
    if (access.kind !== 'lawyer' && access.kind !== 'staff') {
      return forbidden(res, 'Only lawyers and their assistants can open a lawyer workspace');
    }

    const requested = String(req.params.lawyerId ?? '');
    if (access.kind === 'lawyer') {
      if (requested !== 'me' && requested !== access.userId) return notFound(res);
      req.workspace = { lawyerId: access.userId, lawyerName: req.user.name };
      return next();
    }

    // Staff: never 'me', and only a lawyer they have some access to
    if (requested === 'me' || !mongoose.isValidObjectId(requested)) return notFound(res);
    const delegated = access.delegatedLawyers?.find((l) => l.id === requested);
    let lawyerName = delegated?.name;
    if (!delegated) {
      const firmWide = [...access.firm].some((p) => LAWYER_SCOPED.has(p));
      const lawyer = firmWide ? await User.findOne({ _id: requested, ...ACTIVE_LAWYER_FILTER }).select('name').lean() : null;
      if (!lawyer) return notFound(res);
      lawyerName = lawyer.name;
    }
    req.workspace = { lawyerId: requested, lawyerName: lawyerName! };
    req.actingFor = { id: requested, name: lawyerName };
    next();
  } catch (error) {
    next(error);
  }
};

// The actor needs at least one of these permissions for the workspace lawyer
const allow = (...perms: Permission[]) => (req: AuthedRequest, res: Response, next: NextFunction) =>
  perms.some((perm) => can(req.access!, perm, { lawyerId: req.workspace!.lawyerId }))
    ? next()
    : forbidden(res, "You don't have permission to do this for this lawyer");

// "My Team" is the lawyer's own; staff (even ones assisting this lawyer) get 404
const lawyerOnly = (req: AuthedRequest, res: Response, next: NextFunction) =>
  req.access!.kind === 'lawyer' ? next() : notFound(res);

// 20 invites per hour per lawyer (each may create an account and send an email)
const inviteLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  keyGenerator: (req) => String((req as AuthedRequest).user?._id),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { status: 429, message: 'Too many invitations. Please try again later.' },
});

// Handlers read req.workspace, which resolveWorkspace always sets
type Handler = (req: any, res: Response) => unknown;
const h = (handler: Handler) => handler as express.RequestHandler;

router.use(authenticateToken, resolveWorkspace);

router.get('/overview', allow('cases.view', 'appointments.view'), h(getWorkspaceOverview));
router.get('/cases', allow('cases.view'), h(getWorkspaceCases));
router.post('/cases', allow('cases.create'), h(createWorkspaceCase));
router.get('/consultations', allow('appointments.view'), h(getWorkspaceConsultations));
router.get('/availability', allow('availability.manage'), h(getWorkspaceAvailability));
router.put('/availability', allow('availability.manage'), h(updateWorkspaceAvailability));
router.get('/profile', allow('profile.edit'), h(getWorkspaceProfile));
router.put('/profile', allow('profile.edit'), h(updateWorkspaceProfile));
router.post('/profile/image', allow('profile.edit'), multerUpload.single('image'), h(uploadWorkspaceProfileImage));

router.get('/team', lawyerOnly, h(listTeam));
router.post('/team', lawyerOnly, inviteLimiter, validateRequest(inviteAssistantSchema), h(inviteAssistant));
router.get('/team/activity', lawyerOnly, h(listTeamActivity));
router.patch('/team/:staffId', lawyerOnly, validateRequest(updateDelegationSchema), h(updateAssistant));
router.delete('/team/:staffId', lawyerOnly, h(removeAssistant));

export default router;
