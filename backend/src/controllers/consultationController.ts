import { Request, Response } from 'express';
import Consultation, { IConsultation } from '../models/Consultation';
import User from '../models/User';

interface AuthRequest extends Request {
  user?: any;
}

export const bookConsultation = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const { lawyerId, consultationType, date, time, subject, description } = req.body;

    // Validate inputs
    if (!lawyerId || !consultationType || !date || !time || !subject || !description) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // Check if lawyer exists and is verified
    const lawyer = await User.findById(lawyerId);
    if (!lawyer) {
      return res.status(404).json({ message: 'Lawyer not found' });
    }

    if (lawyer.role !== 'lawyer') {
      return res.status(400).json({ message: 'Selected user is not a lawyer' });
    }

    if (!lawyer.isVerified) {
      return res.status(400).json({ message: 'Lawyer account is not verified' });
    }

    // Check for conflicting consultations at the same time
    const existingConsultation = await Consultation.findOne({
      lawyerId,
      date: new Date(date),
      time,
      status: { $in: ['scheduled', 'rescheduled'] },
    });

    if (existingConsultation) {
      return res.status(409).json({ message: 'This time slot is already booked. Please select another time.' });
    }

    // Create new consultation
    const consultation = new Consultation({
      clientId: userId,
      lawyerId,
      consultationType,
      date: new Date(date),
      time,
      subject,
      description,
      status: 'scheduled',
    });

    await consultation.save();

    res.status(201).json({
      message: 'Consultation booked successfully',
      consultation: {
        _id: consultation._id,
        date: consultation.date,
        time: consultation.time,
        subject: consultation.subject,
        lawyerName: lawyer.name,
      },
    });
  } catch (error) {
    console.error('Book consultation error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getMyConsultations = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    let consultations;
    if (user.role === 'client') {
      consultations = await Consultation.find({ clientId: userId })
        .populate('lawyerId', 'name email phone barId')
        .sort({ date: -1 });
    } else if (user.role === 'lawyer') {
      consultations = await Consultation.find({ lawyerId: userId })
        .populate('clientId', 'name email phone')
        .sort({ date: -1 });
    } else {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    res.json({ consultations });
  } catch (error) {
    console.error('Get consultations error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const cancelConsultation = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const { consultationId } = req.params;
    if (!consultationId) {
      return res.status(400).json({ message: 'Consultation ID is required' });
    }

    const consultation = await Consultation.findById(consultationId);
    if (!consultation) {
      return res.status(404).json({ message: 'Consultation not found' });
    }

    // Check if user is the client or lawyer
    if (consultation.clientId.toString() !== userId.toString() && consultation.lawyerId.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'You do not have permission to cancel this consultation' });
    }

    consultation.status = 'cancelled';
    await consultation.save();

    res.json({
      message: 'Consultation cancelled successfully',
      consultation,
    });
  } catch (error) {
    console.error('Cancel consultation error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateConsultationStatus = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const { consultationId } = req.params;
    const { status, notes } = req.body;

    if (!consultationId || !status) {
      return res.status(400).json({ message: 'Consultation ID and status are required' });
    }

    const consultation = await Consultation.findById(consultationId);
    if (!consultation) {
      return res.status(404).json({ message: 'Consultation not found' });
    }

    // Only lawyer can update status
    if (consultation.lawyerId.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Only the lawyer can update consultation status' });
    }

    consultation.status = status;
    if (notes) {
      consultation.notes = notes;
    }

    await consultation.save();

    res.json({
      message: 'Consultation updated successfully',
      consultation,
    });
  } catch (error) {
    console.error('Update consultation error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
