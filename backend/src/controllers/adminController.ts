import { Request, Response } from 'express';
import User from '../models/User';
import Case from '../models/Case';
import Consultation from '../models/Consultation';
import { ACTIVE_STATUSES, businessNow, parseDateOnly } from '../utils/schedule';

// Dashboard stats and appointments. Cases, lawyers and users live in
// adminCaseController, adminLawyerController and adminUserController.

interface AuthRequest extends Request {
  user?: any;
}

export const getAdminStats = async (req: AuthRequest, res: Response) => {
  try {
    // Consultation dates are stored as UTC midnight of the firm's calendar day
    const today = parseDateOnly(businessNow().dateKey) as Date;
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(today.getUTCDate() + 1);

    // Archived cases are kept out of the headline numbers and reported separately
    const [totalCases, activeCases, archivedCases, totalLawyers, totalClients, todayConsultations] = await Promise.all([
      Case.countDocuments({ isArchived: { $ne: true } }),
      Case.countDocuments({ isArchived: { $ne: true }, status: 'active' }),
      Case.countDocuments({ isArchived: true }),
      User.countDocuments({ role: 'lawyer' }),
      User.countDocuments({ role: 'client', isVerified: true }),
      Consultation.countDocuments({
        date: { $gte: today, $lt: tomorrow },
        status: { $in: ['scheduled', 'rescheduled'] },
      }),
    ]);

    res.json({
      status: 200,
      message: 'Stats retrieved successfully',
      data: {
        totalCases,
        activeCases,
        archivedCases,
        totalLawyers,
        totalClients,
        todayConsultations,
      },
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({ status: 500, message: 'Internal server error' });
  }
};

export const getAllConsultationsAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const { status, page = '1', limit = '20' } = req.query;

    const filter: Record<string, any> = {};
    if (status) filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);

    const [consultations, total] = await Promise.all([
      Consultation.find(filter)
        .populate('clientId', 'name email phone')
        .populate('lawyerId', 'name email barId')
        .sort({ date: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Consultation.countDocuments(filter),
    ]);

    res.json({
      status: 200,
      message: 'Consultations retrieved successfully',
      data: consultations,
      meta: { total, page: Number(page), limit: Number(limit) },
    });
  } catch (error) {
    console.error('Admin get consultations error:', error);
    res.status(500).json({ status: 500, message: 'Internal server error' });
  }
};

export const updateConsultationStatusAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const { consultationId } = req.params;
    const { status, notes } = req.body;

    const validStatuses = ['scheduled', 'completed', 'cancelled', 'rescheduled'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ status: 400, message: `Status must be one of: ${validStatuses.join(', ')}` });
    }

    const consultation = await Consultation.findById(consultationId);
    if (!consultation) {
      return res.status(404).json({ status: 404, message: 'Consultation not found' });
    }

    // Re-activating a closed booking must not collide with a booking made for that slot since
    const wasActive = (ACTIVE_STATUSES as readonly string[]).includes(consultation.status);
    const willBeActive = (ACTIVE_STATUSES as readonly string[]).includes(status);
    if (!wasActive && willBeActive) {
      const lawyer = await User.findOne({ _id: consultation.lawyerId, role: 'lawyer' }).select('isBlocked').lean();
      if (!lawyer || lawyer.isBlocked) {
        return res.status(409).json({ status: 409, message: 'The lawyer for this appointment is no longer available, so it cannot be re-opened' });
      }
      const conflict = await Consultation.exists({
        _id: { $ne: consultation._id },
        lawyerId: consultation.lawyerId,
        date: consultation.date,
        time: consultation.time,
        status: { $in: ACTIVE_STATUSES },
      });
      if (conflict) {
        return res.status(409).json({ status: 409, message: 'That time slot has since been booked by another consultation' });
      }
    }

    consultation.status = status;
    if (notes !== undefined) consultation.notes = notes;
    // save() (not findByIdAndUpdate) so the slot guard in the model stays in sync
    await consultation.save();
    await consultation.populate([
      { path: 'clientId', select: 'name email phone' },
      { path: 'lawyerId', select: 'name email barId' },
    ]);

    res.json({
      status: 200,
      message: 'Consultation status updated successfully',
      data: consultation,
    });
  } catch (error) {
    if ((error as { code?: number })?.code === 11000) {
      return res.status(409).json({ status: 409, message: 'That time slot has since been booked by another consultation' });
    }
    console.error('Admin update consultation status error:', error);
    res.status(500).json({ status: 500, message: 'Internal server error' });
  }
};
