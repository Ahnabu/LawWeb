import { Request, Response } from 'express';
import crypto from 'crypto';
import User from '../models/User';
import Case from '../models/Case';
import Consultation from '../models/Consultation';
import { sendAccountSetupLink, ACCOUNT_SETUP_EXPIRY_HOURS } from './authController';
import { revokeAllSessions } from '../utils/session';
import { ACTIVE_STATUSES, businessNow, parseDateOnly } from '../utils/schedule';

interface AuthRequest extends Request {
  user?: any;
}

export const getAdminStats = async (req: AuthRequest, res: Response) => {
  try {
    // Consultation dates are stored as UTC midnight of the firm's calendar day
    const today = parseDateOnly(businessNow().dateKey) as Date;
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(today.getUTCDate() + 1);

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

const ADMIN_CASE_UPDATABLE_FIELDS = [
  'status', 'stage', 'priority', 'type', 'title', 'description', 'lawyerId', 'clientId',
  'clientEmail', 'clientName', 'clientPhone', 'clientWhatsapp', 'isOnline', 'isFeatured',
  'courtName', 'jurisdiction', 'opposingParty', 'opposingCounsel', 'filingDate', 'nextCourtDate',
  'statute', 'caseValue', 'retainerAmount', 'estimatedFee', 'retainerPaid', 'referredBy',
  'caseOrigin', 'witnessNames', 'evidenceSummary', 'internalNotes', 'notes', 'totalPayment',
] as const;

export const updateCaseAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const { caseId } = req.params;
    // Only whitelisted fields; never caseNumber, payments history or ids
    const updates: Record<string, unknown> = {};
    for (const key of ADMIN_CASE_UPDATABLE_FIELDS) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

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

    const consultation = await Consultation.findById(consultationId);
    if (!consultation) {
      return res.status(404).json({ status: 404, message: 'Consultation not found' });
    }

    // Re-activating a closed booking must not collide with a booking made for that slot since
    const wasActive = (ACTIVE_STATUSES as readonly string[]).includes(consultation.status);
    const willBeActive = (ACTIVE_STATUSES as readonly string[]).includes(status);
    if (!wasActive && willBeActive) {
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

    // Random password nobody knows; the lawyer sets their own through the emailed
    // setup link (or "Forgot password"). A shared default password would let
    // anyone who knows a lawyer's email log in before they change it.
    const lawyer = new User({
      name: name.trim(),
      email: normalizedEmail,
      password: crypto.randomBytes(32).toString('hex'),
      role: 'lawyer',
      phone: phone.trim(),
      barId: barId.trim(),
      specialization: specialization?.trim() || undefined,
      isVerified: true,
      passwordNeedsChange: false,
    });
    await lawyer.save();

    let emailSent = true;
    try {
      await sendAccountSetupLink(lawyer);
    } catch (error) {
      emailSent = false;
      console.error('Lawyer setup email failed:', error);
    }

    const savedLawyer = await User.findById(lawyer._id).select('-password');

    res.status(201).json({
      status: 201,
      message: emailSent
        ? `Lawyer account created. A link to set their password was emailed to ${normalizedEmail} (valid ${ACCOUNT_SETUP_EXPIRY_HOURS} hours).`
        : 'Lawyer account created, but the setup email could not be sent. Ask the lawyer to use "Forgot password" on the login page.',
      data: savedLawyer,
      emailSent,
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
    await revokeAllSessions(String(lawyerId));

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
