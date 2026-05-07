import { Request, Response } from 'express';
import User from '../models/User';
import Case from '../models/Case';
import Consultation from '../models/Consultation';

interface AuthRequest extends Request {
  user?: any;
}

export const getAdminStats = async (req: AuthRequest, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const [totalCases, activeCases, totalLawyers, totalClients, todayConsultations] = await Promise.all([
      Case.countDocuments(),
      Case.countDocuments({ status: 'active' }),
      User.countDocuments({ role: 'lawyer', isVerified: true }),
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

export const getAllCasesAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const { status, type, page = '1', limit = '20' } = req.query;

    const filter: Record<string, any> = {};
    if (status) filter.status = status;
    if (type) filter.type = type;

    const skip = (Number(page) - 1) * Number(limit);

    const [cases, total] = await Promise.all([
      Case.find(filter)
        .populate('lawyerId', 'name email barId')
        .populate('clientId', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Case.countDocuments(filter),
    ]);

    res.json({
      status: 200,
      message: 'Cases retrieved successfully',
      data: cases,
      meta: { total, page: Number(page), limit: Number(limit) },
    });
  } catch (error) {
    console.error('Admin get cases error:', error);
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

export const getAllLawyersAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const lawyers = await User.find({ role: 'lawyer' })
      .select('name email phone barId isVerified createdAt')
      .sort({ name: 1 });

    res.json({
      status: 200,
      message: 'Lawyers retrieved successfully',
      data: lawyers,
    });
  } catch (error) {
    console.error('Admin get lawyers error:', error);
    res.status(500).json({ status: 500, message: 'Internal server error' });
  }
};

export const getAllClientsAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const { page = '1', limit = '20' } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [clients, total] = await Promise.all([
      User.find({ role: 'client' })
        .select('name email phone isVerified createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      User.countDocuments({ role: 'client' }),
    ]);

    res.json({
      status: 200,
      message: 'Clients retrieved successfully',
      data: clients,
      meta: { total, page: Number(page), limit: Number(limit) },
    });
  } catch (error) {
    console.error('Admin get clients error:', error);
    res.status(500).json({ status: 500, message: 'Internal server error' });
  }
};

export const toggleLawyerVerification = async (req: AuthRequest, res: Response) => {
  try {
    const { lawyerId } = req.params;

    const lawyer = await User.findById(lawyerId);
    if (!lawyer || lawyer.role !== 'lawyer') {
      return res.status(404).json({ status: 404, message: 'Lawyer not found' });
    }

    lawyer.isVerified = !lawyer.isVerified;
    await lawyer.save();

    res.json({
      status: 200,
      message: `Lawyer ${lawyer.isVerified ? 'verified' : 'unverified'} successfully`,
      data: { _id: lawyer._id, isVerified: lawyer.isVerified },
    });
  } catch (error) {
    console.error('Toggle lawyer verification error:', error);
    res.status(500).json({ status: 500, message: 'Internal server error' });
  }
};
