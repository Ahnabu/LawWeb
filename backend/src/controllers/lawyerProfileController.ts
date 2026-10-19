import { Request, Response } from 'express';
import LawyerProfile from '../models/LawyerProfile';
import User from '../models/User';
import { cloudinary } from '../config/multer.config';
import { recordAudit } from '../utils/audit';
import { normalizeRichText, RICH_TEXT_LIMITS } from '../utils/richText';

interface AuthRequest extends Request {
  user?: any;
}

export const getMyLawyerProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;

    // Use upsert so concurrent requests never cause a duplicate-key error
    let profile = await LawyerProfile.findOne({ userId });

    if (!profile) {
      const user = await User.findById(userId);
      const nameParts = (user?.name || '').trim().split(' ');
      profile = await LawyerProfile.findOneAndUpdate(
        { userId },
        {
          $setOnInsert: {
            userId,
            firstName: nameParts[0] || '',
            lastName: nameParts.slice(1).join(' ') || '',
            barNumber: user?.barId || '',
            joinedAt: user?.createdAt || new Date(),
          },
        },
        { new: true, upsert: true, returnDocument: 'after' }
      );
    }

    res.json({ status: 200, message: 'Profile retrieved successfully', data: profile });
  } catch (error) {
    console.error('Get lawyer profile error:', error);
    res.status(500).json({ status: 500, message: 'Internal server error' });
  }
};

export const uploadProfileImage = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const file = req.file as Express.Multer.File & { path: string; filename: string };

    if (!file) {
      return res.status(400).json({ status: 400, message: 'No image file provided' });
    }

    // Delete previous Cloudinary image if one exists
    const existing = await LawyerProfile.findOne({ userId }).select('profileImageUrl');
    if (existing?.profileImageUrl) {
      // Extract public_id from URL  (format: .../lawweb/profiles/<public_id>.<ext>)
      const parts = existing.profileImageUrl.split('/');
      const filenameWithExt = parts[parts.length - 1];
      const publicId = `lawweb/profiles/${filenameWithExt.split('.')[0]}`;
      await cloudinary.uploader.destroy(publicId).catch(() => {/* ignore if already gone */});
    }

    const imageUrl: string = (file as any).path; // Cloudinary returns the secure URL as file.path

    const profile = await LawyerProfile.findOneAndUpdate(
      { userId },
      { $set: { profileImageUrl: imageUrl } },
      { new: true, upsert: true, returnDocument: 'after' }
    );

    recordAudit(req, {
      action: 'profile.photo_updated',
      category: 'profile',
      targetType: 'lawyer',
      targetId: userId,
      targetLabel: req.user?.name,
      summary: `${req.user?.name ?? 'Lawyer'} uploaded a new profile photo`,
    });

    res.json({ status: 200, message: 'Profile image uploaded successfully', data: { profileImageUrl: imageUrl } });
  } catch (error) {
    console.error('Upload profile image error:', error);
    res.status(500).json({ status: 500, message: 'Internal server error' });
  }
};

export const updateMyLawyerProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;

    const allowedFields = [
      'firstName', 'lastName', 'profileImageUrl', 'designation', 'bio',
      'contactEmail', 'contactPhone', 'whatsappNumber', 'barNumber',
      'yearAdmitted', 'practiceAreas', 'languages', 'education',
      'certifications', 'hourlyRate', 'isActive',
    ];

    const updates: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    // The bio is rich text: store only allowlisted HTML, measured on visible text
    if (updates.bio !== undefined) {
      const raw = updates.bio as Record<string, unknown> | null;
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
        return res.status(400).json({ status: 400, message: 'bio must be an object with en and bn' });
      }
      const bio: { en: string; bn: string } = { en: '', bn: '' };
      for (const lang of ['en', 'bn'] as const) {
        const result = normalizeRichText(raw[lang], lang === 'en' ? 'English bio' : 'Bengali bio', RICH_TEXT_LIMITS.bio);
        if (!result.ok) return res.status(400).json({ status: 400, message: result.message });
        bio[lang] = result.value;
      }
      updates.bio = bio;
    }

    const profile = await LawyerProfile.findOneAndUpdate(
      { userId },
      { $set: updates },
      { new: true, upsert: true, runValidators: true }
    );

    recordAudit(req, {
      action: 'profile.updated',
      category: 'profile',
      targetType: 'lawyer',
      targetId: userId,
      targetLabel: req.user?.name,
      summary: `${req.user?.name ?? 'Lawyer'} updated their public profile`,
      metadata: { fields: Object.keys(updates) },
    });

    res.json({ status: 200, message: 'Profile updated successfully', data: profile });
  } catch (error) {
    console.error('Update lawyer profile error:', error);
    res.status(500).json({ status: 500, message: 'Internal server error' });
  }
};
