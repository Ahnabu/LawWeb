import { Request, Response } from 'express';
import User from '../models/User';
import { cloudinary } from '../config/multer.config';

interface AuthRequest extends Request {
  user?: any;
  file?: Express.Multer.File;
}

export const getMyProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ status: 401, message: 'Not authenticated' });

    const user = await User.findById(userId).select('name email phone role isVerified profileImageUrl createdAt');
    if (!user) return res.status(404).json({ status: 404, message: 'User not found' });

    res.json({ status: 200, message: 'Profile retrieved successfully', data: user });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ status: 500, message: 'Internal server error' });
  }
};

export const updateMyProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ status: 401, message: 'Not authenticated' });

    const { name, phone } = req.body;
    const update: Record<string, string> = {};
    if (typeof name === 'string' && name.trim()) update.name = name.trim();
    if (typeof phone === 'string') update.phone = phone.trim();

    const user = await User.findByIdAndUpdate(userId, { $set: update }, { new: true, runValidators: true })
      .select('name email phone role isVerified profileImageUrl');
    if (!user) return res.status(404).json({ status: 404, message: 'User not found' });

    res.json({ status: 200, message: 'Profile updated successfully', data: user });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ status: 500, message: 'Internal server error' });
  }
};

export const uploadMyProfileImage = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ status: 401, message: 'Not authenticated' });

    if (!req.file) return res.status(400).json({ status: 400, message: 'No image uploaded' });

    const existing = await User.findById(userId).select('profileImageUrl');
    if (existing?.profileImageUrl) {
      const parts = existing.profileImageUrl.split('/');
      const publicIdWithExt = parts.slice(-2).join('/');
      const publicId = publicIdWithExt.replace(/\.[^.]+$/, '');
      await cloudinary.uploader.destroy(publicId).catch(() => {});
    }

    const imageUrl: string = (req.file as any).path;
    await User.findByIdAndUpdate(userId, { $set: { profileImageUrl: imageUrl } });

    res.json({ status: 200, message: 'Profile image uploaded successfully', data: { profileImageUrl: imageUrl } });
  } catch (error) {
    console.error('Upload profile image error:', error);
    res.status(500).json({ status: 500, message: 'Internal server error' });
  }
};
