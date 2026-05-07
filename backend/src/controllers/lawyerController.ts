import { Request, Response } from 'express';
import User from '../models/User';
import LawyerAvailability from '../models/LawyerAvailability';

interface AuthRequest extends Request {
  user?: any;
}

export const getAllLawyers = async (req: Request, res: Response) => {
  try {
    const lawyers = await User.find({ role: 'lawyer', isVerified: true })
      .select('name email phone barId specialization isVerified')
      .sort({ name: 1 });

    res.json({
      message: 'Lawyers retrieved successfully',
      lawyers,
    });
  } catch (error) {
    console.error('Get lawyers error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Public endpoint returning only minimal data (name, specialization, barId) for home/lawyers pages
export const getPublicLawyers = async (req: Request, res: Response) => {
  try {
    const lawyers = await User.find({ role: 'lawyer', isVerified: true })
      .select('name barId specialization')
      .sort({ name: 1 });

    res.json({
      message: 'Lawyers retrieved successfully',
      lawyers,
    });
  } catch (error) {
    console.error('Get public lawyers error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getLawyerProfile = async (req: Request, res: Response) => {
  try {
    const { lawyerId } = req.params;

    if (!lawyerId) {
      return res.status(400).json({ message: 'Lawyer ID is required' });
    }

    const lawyer = await User.findById(lawyerId)
      .select('name email phone barId isVerified role createdAt')
      .lean();

    if (!lawyer) {
      return res.status(404).json({ message: 'Lawyer not found' });
    }

    if (lawyer.role !== 'lawyer') {
      return res.status(400).json({ message: 'User is not a lawyer' });
    }

    res.json({
      message: 'Lawyer profile retrieved successfully',
      lawyer,
    });
  } catch (error) {
    console.error('Get lawyer profile error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getMyAvailability = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;

    let availability = await LawyerAvailability.findOne({ lawyerId: userId });

    if (!availability) {
      // Return default availability if none set yet
      availability = new LawyerAvailability({ lawyerId: userId });
    }

    res.json({
      status: 200,
      message: 'Availability retrieved successfully',
      data: availability,
    });
  } catch (error) {
    console.error('Get availability error:', error);
    res.status(500).json({ status: 500, message: 'Internal server error' });
  }
};

export const updateMyAvailability = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const { schedule, isAcceptingNewClients } = req.body;

    const availability = await LawyerAvailability.findOneAndUpdate(
      { lawyerId: userId },
      {
        $set: {
          ...(schedule !== undefined && { schedule }),
          ...(isAcceptingNewClients !== undefined && { isAcceptingNewClients }),
        },
      },
      { new: true, upsert: true, runValidators: true }
    );

    res.json({
      status: 200,
      message: 'Availability updated successfully',
      data: availability,
    });
  } catch (error) {
    console.error('Update availability error:', error);
    res.status(500).json({ status: 500, message: 'Internal server error' });
  }
};

export const getLawyerAvailabilityPublic = async (req: Request, res: Response) => {
  try {
    const { lawyerId } = req.params;

    const availability = await LawyerAvailability.findOne({ lawyerId }).lean();

    res.json({
      status: 200,
      message: 'Availability retrieved successfully',
      data: availability ?? null,
    });
  } catch (error) {
    console.error('Get lawyer availability error:', error);
    res.status(500).json({ status: 500, message: 'Internal server error' });
  }
};
