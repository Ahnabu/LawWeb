import { Request, Response } from 'express';
import User from '../models/User';

export const getAllLawyers = async (req: Request, res: Response) => {
  try {
    const lawyers = await User.find({ role: 'lawyer', isVerified: true })
      .select('name email phone barId isVerified')
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
