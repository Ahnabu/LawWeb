import { Response } from 'express';
import User from '../models/User';
import type { AuthedRequest } from '../access/types';

// The administrative and support staff shown on the public "Our Team" page,
// below the lawyers. Every staff account appears there, with the photo the
// administrator uploaded on the admin Team page.

type AuthRequest = AuthedRequest;

const serverError = (res: Response, label: string, error: unknown) => {
  console.error(`${label} error:`, error);
  res.status(500).json({ status: 500, message: 'Internal server error' });
};

/** Public: the team, in display order. */
export const listPublicTeamMembers = async (_req: AuthRequest, res: Response) => {
  try {
    const staff = await User.find({ role: 'staff' })
      .select('name email phone profileImageUrl staffRoleId isBlocked')
      .populate('staffRoleId', 'name')
      .sort({ name: 1 })
      .lean();

    const data = staff
      // A blocked account is off the public page until it is unblocked
      .filter((member) => !member.isBlocked)
      .map((member) => ({
        _id: String(member._id),
        name: member.name,
        // staffRoleId is populated with the role's name
        role: (member.staffRoleId as unknown as { name?: string } | null)?.name || 'Team Member',
        photoUrl: member.profileImageUrl || '',
        phone: member.phone || '',
        email: member.email || '',
        bio: '',
      }));

    res.json({
      status: 200,
      message: 'Team retrieved successfully',
      data,
    });
  } catch (error) {
    serverError(res, 'List public team members', error);
  }
};
