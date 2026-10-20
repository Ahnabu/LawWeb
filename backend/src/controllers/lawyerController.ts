import { Request, Response } from 'express';
import User from '../models/User';
import LawyerAvailability from '../models/LawyerAvailability';
import LawyerProfile from '../models/LawyerProfile';
import Consultation from '../models/Consultation';
import { recordAudit } from '../utils/audit';
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
import type { AuthedRequest as AuthRequest } from '../access/types';

// Who the public site lists and lets clients book: verified, not blocked.
// Deleted lawyers simply no longer exist.
const PUBLIC_LAWYER_FILTER = { role: 'lawyer' as const, isVerified: true, isBlocked: { $ne: true } };
// Admin-defined order (drag-and-drop), name as a tie-breaker
const PUBLIC_LAWYER_SORT = { sortOrder: 1, name: 1 } as const;

const isBookableLawyer = (lawyerId: string) => User.exists({ _id: lawyerId, ...PUBLIC_LAWYER_FILTER });

export const getAllLawyers = async (req: Request, res: Response) => {
  try {
    const lawyers = await User.find(PUBLIC_LAWYER_FILTER)
      .select('name email phone barId specialization isVerified')
      .sort(PUBLIC_LAWYER_SORT);

    res.json({
      message: 'Lawyers retrieved successfully',
      lawyers,
    });
  } catch (error) {
    console.error('Get lawyers error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Public endpoint returning only card data (name, specialization, barId, plus
// photo and designation from LawyerProfile) for the home and lawyers pages
export const getPublicLawyers = async (req: Request, res: Response) => {
  try {
    const users = await User.find(PUBLIC_LAWYER_FILTER)
      .select('name barId specialization profileImageUrl')
      .sort(PUBLIC_LAWYER_SORT)
      .lean();

    const profiles = await LawyerProfile.find({ userId: { $in: users.map((u) => u._id) } })
      .select('userId designation profileImageUrl')
      .lean();
    const profileByUser = new Map(profiles.map((p) => [String(p.userId), p]));

    const lawyers = users.map((user) => {
      const profile = profileByUser.get(String(user._id));
      return {
        ...user,
        profileImageUrl: profile?.profileImageUrl || user.profileImageUrl || undefined,
        designation: { en: profile?.designation?.en ?? '', bn: profile?.designation?.bn ?? '' },
      };
    });

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

    if (!lawyerId || !mongoose.isValidObjectId(lawyerId)) {
      return res.status(400).json({ message: 'A valid lawyer ID is required' });
    }

    const [found, profile] = await Promise.all([
      User.findById(lawyerId)
        .select('name email phone barId specialization isVerified isBlocked role createdAt')
        .lean(),
      LawyerProfile.findOne({ userId: lawyerId }).lean(),
    ]);

    // Blocked lawyers are hidden from the public site like deleted ones
    if (!found || found.isBlocked) {
      return res.status(404).json({ message: 'Lawyer not found' });
    }
    const { isBlocked: _isBlocked, ...lawyer } = found;

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

// Cores take an explicit lawyer, so the Phase 3 workspace routes (/:lawyerId)
// reuse them; the /me handlers pass the signed-in lawyer.
type Id = mongoose.Types.ObjectId | string;

export const readAvailability = async (lawyerId: Id) =>
  // Default availability if none set yet
  (await LawyerAvailability.findOne({ lawyerId })) ?? new LawyerAvailability({ lawyerId });

// `lawyer` is the account whose schedule changes; the audit entry names them,
// so an assistant's edit reads "Sara updated Adv. Rahman's availability" (Phase 3)
export const writeAvailability = async (
  req: AuthRequest,
  lawyer: { _id: Id; name?: string },
  body: { schedule?: unknown; isAcceptingNewClients?: unknown }
) => {
  const { schedule, isAcceptingNewClients } = body;

  let normalizedSchedule: WeekSchedule | undefined;
  if (schedule !== undefined) {
    const result = normalizeSchedule(schedule);
    if (result.error) return { ok: false as const, message: result.error };
    normalizedSchedule = result.schedule;
  }

  if (isAcceptingNewClients !== undefined && typeof isAcceptingNewClients !== 'boolean') {
    return { ok: false as const, message: 'isAcceptingNewClients must be a boolean' };
  }

  const availability = await LawyerAvailability.findOneAndUpdate(
    { lawyerId: lawyer._id },
    {
      $set: {
        ...(normalizedSchedule && { schedule: normalizedSchedule }),
        ...(isAcceptingNewClients !== undefined && { isAcceptingNewClients }),
      },
    },
    { new: true, upsert: true, runValidators: true }
  );

  const self = String(lawyer._id) === String(req.user?._id);
  recordAudit(req, {
    action: 'availability.updated',
    category: 'profile',
    targetType: 'lawyer',
    targetId: lawyer._id,
    targetLabel: lawyer.name,
    summary: self
      ? `${lawyer.name ?? 'Lawyer'} updated their availability`
      : `${req.user?.name ?? 'Someone'} updated ${lawyer.name ?? 'a lawyer'}'s availability`,
    metadata: {
      fields: [...(normalizedSchedule ? ['schedule'] : []), ...(isAcceptingNewClients !== undefined ? ['isAcceptingNewClients'] : [])],
      ...(isAcceptingNewClients !== undefined ? { isAcceptingNewClients } : {}),
    },
  });

  return { ok: true as const, availability };
};

export const getMyAvailability = async (req: AuthRequest, res: Response) => {
  try {
    const availability = await readAvailability(req.user?._id);

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
    const result = await writeAvailability(req, req.user, req.body ?? {});
    if (!result.ok) {
      return res.status(400).json({ status: 400, message: result.message });
    }

    res.json({
      status: 200,
      message: 'Availability updated successfully',
      data: result.availability,
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

    if (!(await isBookableLawyer(String(lawyerId)))) {
      return res.status(404).json({ status: 404, message: 'Lawyer not found' });
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

    if (!(await isBookableLawyer(String(lawyerId)))) {
      return res.status(404).json({ status: 404, message: 'Lawyer not found' });
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
