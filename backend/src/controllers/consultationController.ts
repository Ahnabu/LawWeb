import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Consultation from '../models/Consultation';
import Case from '../models/Case';
import User from '../models/User';
import LawyerAvailability from '../models/LawyerAvailability';
import {
  ACTIVE_STATUSES,
  WeekSchedule,
  dayKeyOf,
  defaultSchedule,
  formatSlotLabel,
  generateSlots,
  hasSlotStarted,
  parseDateOnly,
  toMinutes,
} from '../utils/schedule';

interface AuthRequest extends Request {
  user?: any;
}

const isDuplicateKeyError = (error: unknown) =>
  typeof error === 'object' && error !== null && (error as { code?: number }).code === 11000;

const isValidationError = (error: unknown) =>
  error instanceof mongoose.Error.ValidationError || error instanceof mongoose.Error.CastError;

const isActive = (status: string) => (ACTIVE_STATUSES as readonly string[]).includes(status);

// Whether this client already has a relationship with the lawyer (prior booking or case),
// so "not accepting new clients" does not lock out existing clients.
const isExistingClient = async (clientId: string, lawyerId: string) => {
  const [consultation, existingCase] = await Promise.all([
    Consultation.exists({ clientId, lawyerId, status: { $ne: 'cancelled' } }),
    Case.exists({ clientId, lawyerId }),
  ]);
  return Boolean(consultation || existingCase);
};

export const bookConsultation = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    if (req.user.role !== 'client') {
      return res.status(403).json({ message: 'Only clients can book consultations' });
    }

    const { lawyerId, consultationType, meetingMode, date, time, subject, description, clientPhone, whatsappDocSharing, whatsappDocNote } = req.body;

    // Validate inputs
    if (!lawyerId || !consultationType || !date || !time || !subject?.trim() || !description?.trim()) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (!mongoose.isValidObjectId(lawyerId)) {
      return res.status(400).json({ message: 'Invalid lawyer ID' });
    }

    const bookingDate = parseDateOnly(date);
    if (!bookingDate) {
      return res.status(400).json({ message: 'Invalid date. Expected format YYYY-MM-DD.' });
    }

    const slotMinutes = toMinutes(time);
    if (slotMinutes === null) {
      return res.status(400).json({ message: 'Invalid time slot' });
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

    // Validate against the lawyer's schedule. Lawyers who never saved a schedule
    // get the same defaults their availability page shows them.
    const availability = await LawyerAvailability.findOne({ lawyerId }).lean();
    const schedule = (availability?.schedule ?? defaultSchedule()) as WeekSchedule;

    if (availability && !availability.isAcceptingNewClients && !(await isExistingClient(userId, lawyerId))) {
      return res.status(400).json({ message: 'This lawyer is not currently accepting new clients.' });
    }

    const dayName = dayKeyOf(bookingDate);
    const daySchedule = schedule[dayName];
    if (!daySchedule?.isAvailable) {
      return res.status(400).json({ message: `The lawyer is not available on ${dayName.charAt(0).toUpperCase() + dayName.slice(1)}s. Please choose another date.` });
    }

    if (!generateSlots(daySchedule).includes(slotMinutes)) {
      return res.status(400).json({ message: `Please choose a time slot between ${daySchedule.startTime} and ${daySchedule.endTime}.` });
    }

    if (hasSlotStarted(bookingDate, slotMinutes)) {
      return res.status(400).json({ message: 'This time slot has already passed. Please choose a future time.' });
    }

    const slotLabel = formatSlotLabel(slotMinutes);

    // Check for conflicting consultations at the same time
    const existingConsultation = await Consultation.findOne({
      lawyerId,
      date: bookingDate,
      time: slotLabel,
      status: { $in: ACTIVE_STATUSES },
    });

    if (existingConsultation) {
      return res.status(409).json({ message: 'This time slot is already booked. Please select another time.' });
    }

    // Create new consultation
    const consultation = new Consultation({
      clientId: userId,
      lawyerId,
      consultationType,
      meetingMode: meetingMode || 'in-person',
      date: bookingDate,
      time: slotLabel,
      subject,
      description,
      clientPhone: clientPhone || undefined,
      status: 'scheduled',
      lawyerConfirmed: false,
      whatsappDocSharing: Boolean(whatsappDocSharing),
      whatsappDocNote: whatsappDocSharing ? whatsappDocNote || undefined : undefined,
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
    if (isDuplicateKeyError(error)) {
      return res.status(409).json({ message: 'This time slot is already booked. Please select another time.' });
    }
    if (isValidationError(error)) {
      return res.status(400).json({ message: (error as Error).message });
    }
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

    if (!isActive(consultation.status)) {
      return res.status(400).json({ message: `A ${consultation.status} consultation cannot be cancelled` });
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

export const confirmConsultation = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    if (!userId) return res.status(401).json({ message: 'Not authenticated' });

    const { consultationId } = req.params;
    const consultation = await Consultation.findById(consultationId);
    if (!consultation) return res.status(404).json({ message: 'Consultation not found' });

    if (consultation.lawyerId.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Only the assigned lawyer can confirm this consultation' });
    }

    if (!isActive(consultation.status)) {
      return res.status(400).json({ message: `A ${consultation.status} consultation cannot be confirmed` });
    }

    consultation.lawyerConfirmed = true;
    await consultation.save();

    res.json({ message: 'Consultation confirmed', consultation });
  } catch (error) {
    console.error('Confirm consultation error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getNotifications = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const role = req.user?.role;
    if (!userId) return res.status(401).json({ message: 'Not authenticated' });

    const notifications: { id: string; title: string; body: string; time: Date; type: string }[] = [];

    if (role === 'lawyer') {
      // Unconfirmed scheduled appointments
      const unconfirmed = await Consultation.find({ lawyerId: userId, lawyerConfirmed: false, status: 'scheduled' })
        .populate('clientId', 'name')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();
      for (const c of unconfirmed) {
        const client = c.clientId as any;
        notifications.push({
          id: String(c._id),
          title: 'New booking awaiting confirmation',
          body: `${client?.name || 'A client'} booked on ${new Date(c.date).toLocaleDateString('en-GB', { timeZone: 'UTC' })} at ${c.time}`,
          time: c.createdAt as Date,
          type: 'appointment',
        });
      }
      // Recently updated cases
      const recentCases = await Case
        .find({ lawyerId: userId })
        .sort({ updatedAt: -1 })
        .limit(3)
        .lean();
      for (const cs of recentCases) {
        notifications.push({
          id: String(cs._id),
          title: `Case ${cs.status.replace(/-/g, ' ')}`,
          body: cs.title,
          time: cs.updatedAt as Date,
          type: 'case',
        });
      }
    } else if (role === 'client') {
      // Recent appointment changes
      const consultations = await Consultation.find({ clientId: userId })
        .populate('lawyerId', 'name')
        .sort({ updatedAt: -1 })
        .limit(5)
        .lean();
      for (const c of consultations) {
        const lawyer = c.lawyerId as any;
        notifications.push({
          id: String(c._id),
          title: c.lawyerConfirmed ? 'Appointment confirmed by lawyer' : `Appointment ${c.status}`,
          body: `${c.subject} — ${lawyer?.name || 'Lawyer'}`,
          time: c.updatedAt as Date,
          type: 'appointment',
        });
      }
      // Case updates
      const cases = await Case
        .find({ clientId: userId })
        .sort({ updatedAt: -1 })
        .limit(3)
        .lean();
      for (const cs of cases) {
        notifications.push({
          id: String(cs._id),
          title: `Case update: ${cs.status.replace(/-/g, ' ')}`,
          body: cs.title,
          time: cs.updatedAt as Date,
          type: 'case',
        });
      }
    } else if (role === 'admin') {
      const recent = await Consultation.find()
        .populate('clientId', 'name')
        .populate('lawyerId', 'name')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();
      for (const c of recent) {
        const client = c.clientId as any;
        notifications.push({
          id: String(c._id),
          title: 'New consultation booked',
          body: `${client?.name || 'Client'} — ${c.subject}`,
          time: c.createdAt as Date,
          type: 'appointment',
        });
      }
    }

    // Sort by time desc and return top 8
    notifications.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

    res.json({ notifications: notifications.slice(0, 8) });
  } catch (error) {
    console.error('Get notifications error:', error);
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

    // Lawyers can close out an active booking; re-opening goes through a new booking or admin
    if (!['completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ message: 'Status must be either completed or cancelled' });
    }

    if (!isActive(consultation.status)) {
      return res.status(400).json({ message: `This consultation is already ${consultation.status}` });
    }

    if (status === 'completed') {
      const startMinutes = toMinutes(consultation.time);
      if (startMinutes !== null && !hasSlotStarted(consultation.date, startMinutes)) {
        return res.status(400).json({ message: 'A consultation cannot be marked completed before its scheduled time' });
      }
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
