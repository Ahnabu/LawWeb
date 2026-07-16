import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
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

export const createCaseAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const { clientEmail, clientName, lawyerId, type, title, description, isOnline, nextCourtDate, notes, totalPayment } = req.body;

    if (!clientEmail || !clientName || !lawyerId || !type || !title || !description) {
      return res.status(400).json({ status: 400, message: 'Required fields: clientEmail, clientName, lawyerId, type, title, description' });
    }

    const lawyer = await User.findById(lawyerId);
    if (!lawyer || lawyer.role !== 'lawyer') {
      return res.status(400).json({ status: 400, message: 'Invalid lawyer ID' });
    }

    // Try to find client account by email
    const clientUser = await User.findOne({ email: clientEmail.toLowerCase(), role: 'client' });

    const newCase = new Case({
      clientId: clientUser?._id,
      clientEmail: clientEmail.toLowerCase(),
      clientName,
      lawyerId,
      type,
      title,
      description,
      isOnline: isOnline ?? true,
      nextCourtDate: nextCourtDate ? new Date(nextCourtDate) : undefined,
      notes,
      totalPayment: totalPayment || 0,
    });

    await newCase.save();
    await newCase.populate('lawyerId', 'name email barId');

    res.status(201).json({
      status: 201,
      message: 'Case created successfully',
      data: newCase,
    });
  } catch (error) {
    console.error('Admin create case error:', error);
    res.status(500).json({ status: 500, message: 'Internal server error' });
  }
};

export const updateCaseAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const { caseId } = req.params;
    const updates = req.body;

    const updatedCase = await Case.findByIdAndUpdate(
      caseId,
      { $set: updates },
      { new: true, runValidators: true }
    )
      .populate('lawyerId', 'name email barId')
      .populate('clientId', 'name email');

    if (!updatedCase) {
      return res.status(404).json({ status: 404, message: 'Case not found' });
    }

    res.json({
      status: 200,
      message: 'Case updated successfully',
      data: updatedCase,
    });
  } catch (error) {
    console.error('Admin update case error:', error);
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

    const consultation = await Consultation.findByIdAndUpdate(
      consultationId,
      { $set: { status, ...(notes !== undefined && { notes }) } },
      { new: true }
    )
      .populate('clientId', 'name email phone')
      .populate('lawyerId', 'name email barId');

    if (!consultation) {
      return res.status(404).json({ status: 404, message: 'Consultation not found' });
    }

    res.json({
      status: 200,
      message: 'Consultation status updated successfully',
      data: consultation,
    });
  } catch (error) {
    console.error('Admin update consultation status error:', error);
    res.status(500).json({ status: 500, message: 'Internal server error' });
  }
};

export const getAllLawyersAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const lawyers = await User.find({ role: 'lawyer' })
      .select('name email phone barId specialization isVerified passwordNeedsChange createdAt')
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

export const addLawyerAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, phone, barId, specialization } = req.body;

    if (!name || !email || !phone || !barId) {
      return res.status(400).json({ status: 400, message: 'Required fields: name, email, phone, barId' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({ status: 409, message: 'A user with this email already exists' });
    }

    // Hash password manually and use collection.insertOne to bypass the pre-save re-hash hook
    const hashedPassword = await bcrypt.hash('123456', 12);
    const now = new Date();

    await User.collection.insertOne({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      role: 'lawyer',
      phone: phone.trim(),
      barId: barId.trim(),
      specialization: specialization?.trim() || undefined,
      isVerified: true,
      passwordNeedsChange: true,
      createdAt: now,
      updatedAt: now,
    });

    const savedLawyer = await User.findOne({ email: normalizedEmail }).select('-password');

    res.status(201).json({
      status: 201,
      message: 'Lawyer account created successfully. Default password is 123456.',
      data: savedLawyer,
    });
  } catch (error) {
    console.error('Admin add lawyer error:', error);
    res.status(500).json({ status: 500, message: 'Internal server error' });
  }
};

export const deleteLawyerAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const { lawyerId } = req.params;

    const lawyer = await User.findById(lawyerId);
    if (!lawyer || lawyer.role !== 'lawyer') {
      return res.status(404).json({ status: 404, message: 'Lawyer not found' });
    }

    await User.findByIdAndDelete(lawyerId);

    res.json({ status: 200, message: 'Lawyer removed successfully' });
  } catch (error) {
    console.error('Admin delete lawyer error:', error);
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

export const getLawyerDetailsAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const { lawyerId } = req.params;

    const lawyer = await User.findById(lawyerId).select(
      'name email phone barId role specialization isVerified passwordNeedsChange profileImageUrl createdAt updatedAt'
    );

    if (!lawyer || lawyer.role !== 'lawyer') {
      return res.status(404).json({ status: 404, message: 'Lawyer not found' });
    }

    // Fetch related stats
    const Case = (await import('../models/Case')).default;
    const Consultation = (await import('../models/Consultation')).default;

    const [totalCases, activeCases, totalConsultations] = await Promise.all([
      Case.countDocuments({ lawyerId }),
      Case.countDocuments({ lawyerId, status: 'active' }),
      Consultation.countDocuments({ lawyerId }),
    ]);

    res.json({
      status: 200,
      message: 'Lawyer details retrieved successfully',
      data: {
        ...lawyer.toObject(),
        stats: { totalCases, activeCases, totalConsultations },
      },
    });
  } catch (error) {
    console.error('Admin get lawyer details error:', error);
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
