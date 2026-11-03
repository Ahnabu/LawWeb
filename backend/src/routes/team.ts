import express from 'express';
import { listPublicTeamMembers } from '../controllers/teamMemberController';

const router = express.Router();

// The public "Our admins and staff" section of the team page. Every staff
// account appears here, so the public page follows the staff accounts.

router.get('/', listPublicTeamMembers);

export default router;
