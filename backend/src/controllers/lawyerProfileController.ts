import { Request, Response } from 'express';
import LawyerProfile from '../models/LawyerProfile';
import User from '../models/User';
import { cloudinary } from '../config/multer.config';

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

    const profile = await LawyerProfile.findOneAndUpdate(
      { userId },
      { $set: updates },
      { new: true, upsert: true, runValidators: true }
    );

    res.json({ status: 200, message: 'Profile updated successfully', data: profile });
  } catch (error) {
    console.error('Update lawyer profile error:', error);
    res.status(500).json({ status: 500, message: 'Internal server error' });
  }
};
