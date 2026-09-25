import { Request, Response } from 'express';
import User from '../models/User';
import LawyerAvailability from '../models/LawyerAvailability';
import LawyerProfile from '../models/LawyerProfile';
import Consultation from '../models/Consultation';
import mongoose from 'mongoose';
import {
  ACTIVE_STATUSES,
  WeekSchedule,
  businessNow,
  dayKeyOf,
  defaultSchedule,
  formatSlotLabel,
  generateSlots,
  hasSlotStarted,
  normalizeSchedule,
  parseDateOnly,
  toDateKey,
  toMinutes,
} from '../utils/schedule';

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

    const [lawyer, profile] = await Promise.all([
      User.findById(lawyerId)
        .select('name email phone barId specialization isVerified role createdAt')
        .lean(),
      LawyerProfile.findOne({ userId: lawyerId }).lean(),
    ]);

    if (!lawyer) {
      return res.status(404).json({ message: 'Lawyer not found' });
    }

    if (lawyer.role !== 'lawyer') {
      return res.status(400).json({ message: 'User is not a lawyer' });
    }

    res.json({
      message: 'Lawyer profile retrieved successfully',
      lawyer,
      profile: profile || null,
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

    let normalizedSchedule: WeekSchedule | undefined;
    if (schedule !== undefined) {
      const result = normalizeSchedule(schedule);
      if (result.error) {
        return res.status(400).json({ status: 400, message: result.error });
      }
      normalizedSchedule = result.schedule;
    }

    if (isAcceptingNewClients !== undefined && typeof isAcceptingNewClients !== 'boolean') {
      return res.status(400).json({ status: 400, message: 'isAcceptingNewClients must be a boolean' });
    }

    const availability = await LawyerAvailability.findOneAndUpdate(
      { lawyerId: userId },
      {
        $set: {
          ...(normalizedSchedule && { schedule: normalizedSchedule }),
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
    if (!mongoose.isValidObjectId(lawyerId)) {
      return res.status(400).json({ status: 400, message: 'Invalid lawyer ID' });
    }

    const availability = await LawyerAvailability.findOne({ lawyerId }).lean();

    // Lawyers who never saved a schedule are bookable on the model defaults,
    // so expose those instead of null (which the booking form treats as "no slots").
    res.json({
      status: 200,
      message: 'Availability retrieved successfully',
      data: availability ?? {
        lawyerId,
        isAcceptingNewClients: true,
        schedule: defaultSchedule(),
      },
    });
  } catch (error) {
    console.error('Get lawyer availability error:', error);
    res.status(500).json({ status: 500, message: 'Internal server error' });
  }
};

// Public: bookable slots for one lawyer on one date, with booked/past slots flagged.
// Exposes only times, never who booked them.
export const getLawyerSlotsPublic = async (req: Request, res: Response) => {
  try {
    const { lawyerId } = req.params;
    if (!mongoose.isValidObjectId(lawyerId)) {
      return res.status(400).json({ status: 400, message: 'Invalid lawyer ID' });
    }

    const date = parseDateOnly(req.query.date);
    if (!date) {
      return res.status(400).json({ status: 400, message: 'A valid date (YYYY-MM-DD) is required' });
    }

    const availability = await LawyerAvailability.findOne({ lawyerId }).lean();
    const schedule = (availability?.schedule ?? defaultSchedule()) as WeekSchedule;
    const daySchedule = schedule[dayKeyOf(date)];
    const slotStarts = generateSlots(daySchedule);

    const booked = slotStarts.length
      ? await Consultation.find({ lawyerId, date, status: { $in: ACTIVE_STATUSES } }).select('time').lean()
      : [];
    const bookedMinutes = new Set(booked.map((c) => toMinutes(c.time)));

    res.json({
      status: 200,
      message: 'Slots retrieved successfully',
      data: {
        date: toDateKey(date),
        isAvailable: Boolean(daySchedule?.isAvailable),
        isAcceptingNewClients: availability?.isAcceptingNewClients ?? true,
        startTime: daySchedule?.startTime,
        endTime: daySchedule?.endTime,
        today: businessNow().dateKey,
        slots: slotStarts.map((minutes) => {
          const isBooked = bookedMinutes.has(minutes);
          const isPast = hasSlotStarted(date, minutes);
          return {
            time: formatSlotLabel(minutes),
            available: !isBooked && !isPast,
            reason: isBooked ? 'booked' : isPast ? 'past' : undefined,
          };
        }),
      },
    });
  } catch (error) {
    console.error('Get lawyer slots error:', error);
    res.status(500).json({ status: 500, message: 'Internal server error' });
  }
};
