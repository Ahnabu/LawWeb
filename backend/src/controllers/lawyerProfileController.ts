import { Response } from 'express';
import mongoose from 'mongoose';
import LawyerProfile from '../models/LawyerProfile';
import User from '../models/User';
import { cloudinary } from '../config/multer.config';
import { recordAudit } from '../utils/audit';
import { normalizeRichText, RICH_TEXT_LIMITS } from '../utils/richText';
import type { AuthedRequest as AuthRequest } from '../access/types';

// Cores take an explicit lawyer, so the Phase 3 workspace routes (/:lawyerId)
// reuse them; the /me handlers pass the signed-in lawyer. Audit entries name the
// lawyer whose profile changed, and the actor when that is someone else.
type Id = mongoose.Types.ObjectId | string;
type LawyerRef = { _id: Id; name?: string };

const auditSummary = (req: AuthRequest, lawyer: LawyerRef, own: string, other: string) =>
  String(lawyer._id) === String(req.user?._id)
    ? `${lawyer.name ?? 'Lawyer'} ${own}`
    : `${req.user?.name ?? 'Someone'} ${other.replace('{lawyer}', `${lawyer.name ?? 'a lawyer'}'s`)}`;

export const readLawyerProfile = async (lawyerId: Id) => {
  const profile = await LawyerProfile.findOne({ userId: lawyerId });
  if (profile) return profile;

  // Use upsert so concurrent requests never cause a duplicate-key error
  const user = await User.findById(lawyerId);
  const nameParts = (user?.name || '').trim().split(' ');
  return LawyerProfile.findOneAndUpdate(
    { userId: lawyerId },
    {
      $setOnInsert: {
        userId: lawyerId,
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || '',
        barNumber: user?.barId || '',
        joinedAt: user?.createdAt || new Date(),
      },
    },
    { new: true, upsert: true, returnDocument: 'after' }
  );
};

const ALLOWED_PROFILE_FIELDS = [
  'firstName', 'lastName', 'profileImageUrl', 'designation', 'bio',
  'contactEmail', 'contactPhone', 'whatsappNumber', 'barNumber',
  'yearAdmitted', 'practiceAreas', 'languages', 'education',
  'certifications', 'hourlyRate', 'isActive',
];

export const writeLawyerProfile = async (req: AuthRequest, lawyer: LawyerRef, body: Record<string, unknown>) => {
  const updates: Record<string, unknown> = {};
  for (const field of ALLOWED_PROFILE_FIELDS) {
    if (body[field] !== undefined) {
      updates[field] = body[field];
    }
  }

  // The bio is rich text: store only allowlisted HTML, measured on visible text
  if (updates.bio !== undefined) {
    const raw = updates.bio as Record<string, unknown> | null;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return { ok: false as const, message: 'bio must be an object with en and bn' };
    }
    const bio: { en: string; bn: string } = { en: '', bn: '' };
    for (const lang of ['en', 'bn'] as const) {
      const result = normalizeRichText(raw[lang], lang === 'en' ? 'English bio' : 'Bengali bio', RICH_TEXT_LIMITS.bio);
      if (!result.ok) return { ok: false as const, message: result.message };
      bio[lang] = result.value;
    }
    updates.bio = bio;
  }

  const profile = await LawyerProfile.findOneAndUpdate(
    { userId: lawyer._id },
    { $set: updates },
    { new: true, upsert: true, runValidators: true }
  );

  recordAudit(req, {
    action: 'profile.updated',
    category: 'profile',
    targetType: 'lawyer',
    targetId: lawyer._id,
    targetLabel: lawyer.name,
    summary: auditSummary(req, lawyer, 'updated their public profile', 'updated {lawyer} public profile'),
    metadata: { fields: Object.keys(updates) },
  });

  return { ok: true as const, profile };
};

// Cloudinary returns the secure URL as file.path
export const writeProfileImage = async (req: AuthRequest, lawyer: LawyerRef, file: Express.Multer.File & { path: string }) => {
  // Delete previous Cloudinary image if one exists
  const existing = await LawyerProfile.findOne({ userId: lawyer._id }).select('profileImageUrl');
  if (existing?.profileImageUrl) {
    // Extract public_id from URL  (format: .../lawweb/profiles/<public_id>.<ext>)
    const parts = existing.profileImageUrl.split('/');
    const filenameWithExt = parts[parts.length - 1];
    const publicId = `lawweb/profiles/${filenameWithExt.split('.')[0]}`;
    await cloudinary.uploader.destroy(publicId).catch(() => {/* ignore if already gone */});
  }

  const imageUrl: string = file.path;
  await LawyerProfile.findOneAndUpdate(
    { userId: lawyer._id },
    { $set: { profileImageUrl: imageUrl } },
    { new: true, upsert: true, returnDocument: 'after' }
  );

  recordAudit(req, {
    action: 'profile.photo_updated',
    category: 'profile',
    targetType: 'lawyer',
    targetId: lawyer._id,
    targetLabel: lawyer.name,
    summary: auditSummary(req, lawyer, 'uploaded a new profile photo', 'uploaded a new profile photo for {lawyer} profile'),
  });

  return imageUrl;
};

export const getMyLawyerProfile = async (req: AuthRequest, res: Response) => {
  try {
    const profile = await readLawyerProfile(req.user?._id);
    res.json({ status: 200, message: 'Profile retrieved successfully', data: profile });
  } catch (error) {
    console.error('Get lawyer profile error:', error);
    res.status(500).json({ status: 500, message: 'Internal server error' });
  }
};

export const uploadProfileImage = async (req: AuthRequest, res: Response) => {
  try {
    const file = req.file as Express.Multer.File & { path: string; filename: string };

    if (!file) {
      return res.status(400).json({ status: 400, message: 'No image file provided' });
    }

    const imageUrl = await writeProfileImage(req, req.user, file);
    res.json({ status: 200, message: 'Profile image uploaded successfully', data: { profileImageUrl: imageUrl } });
  } catch (error) {
    console.error('Upload profile image error:', error);
    res.status(500).json({ status: 500, message: 'Internal server error' });
  }
};

export const updateMyLawyerProfile = async (req: AuthRequest, res: Response) => {
  try {
    const result = await writeLawyerProfile(req, req.user, req.body ?? {});
    if (!result.ok) {
      return res.status(400).json({ status: 400, message: result.message });
    }
    res.json({ status: 200, message: 'Profile updated successfully', data: result.profile });
  } catch (error) {
    console.error('Update lawyer profile error:', error);
    res.status(500).json({ status: 500, message: 'Internal server error' });
  }
};
