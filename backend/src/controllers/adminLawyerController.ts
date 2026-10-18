import { Request, Response } from 'express';
import crypto from 'crypto';
import mongoose from 'mongoose';
import User from '../models/User';
import Case from '../models/Case';
import Consultation from '../models/Consultation';
import LawyerProfile from '../models/LawyerProfile';
import LawyerAvailability from '../models/LawyerAvailability';
import { sendAccountSetupLink, ACCOUNT_SETUP_EXPIRY_HOURS } from './authController';
import { revokeAllSessions } from '../utils/session';
import { sendAppointmentCancelledEmail } from '../utils/email';
import { getFrontendUrl } from '../config/env';
import { ACTIVE_STATUSES, businessNow, hasSlotStarted, parseDateOnly, toMinutes } from '../utils/schedule';
import { cloudinary } from '../config/multer.config';

interface AuthRequest extends Request {
  user?: any;
}

// Fields the admin list and the edit form need. Never includes password data.
const LAWYER_LIST_FIELDS =
  'name email phone barId specialization isVerified passwordNeedsChange profileImageUrl sortOrder isBlocked blockedAt blockedReason createdAt updatedAt';

const LAWYER_GONE_REASON = 'Cancelled: the assigned lawyer is no longer with the firm.';
const IMPACT_LIST_LIMIT = 5;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[+\d][\d\s()-]{4,29}$/;

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const isDuplicateKeyError = (error: unknown) =>
  typeof error === 'object' && error !== null && (error as { code?: number }).code === 11000;

const splitName = (name: string) => {
  const parts = name.trim().split(/\s+/);
  return { firstName: parts[0] || '', lastName: parts.slice(1).join(' ') };
};

// Attaches the public-profile bits that live on LawyerProfile (designation, photo)
const withProfileData = async <T extends { _id: mongoose.Types.ObjectId; profileImageUrl?: string }>(lawyers: T[]) => {
  if (!lawyers.length) return [];
  const profiles = await LawyerProfile.find({ userId: { $in: lawyers.map((l) => l._id) } })
    .select('userId designation profileImageUrl')
    .lean();
  const byUser = new Map(profiles.map((p) => [String(p.userId), p]));
  return lawyers.map((lawyer) => {
    const profile = byUser.get(String(lawyer._id));
    return {
      ...lawyer,
      profileImageUrl: profile?.profileImageUrl || lawyer.profileImageUrl,
      designation: { en: profile?.designation?.en ?? '', bn: profile?.designation?.bn ?? '' },
    };
  });
};

const loadLawyerForAdmin = async (lawyerId: unknown) => {
  const lawyer = await User.findById(lawyerId).select(LAWYER_LIST_FIELDS).lean();
  if (!lawyer) return null;
  const [withProfile] = await withProfileData([lawyer]);
  return withProfile;
};

export const getAllLawyersAdmin = async (req: AuthRequest, res: Response) => {
  try {
    // Same order as the public site, so the admin list doubles as the reorder list
    const lawyers = await User.find({ role: 'lawyer' })
      .select(LAWYER_LIST_FIELDS)
      .sort({ sortOrder: 1, name: 1 })
      .lean();

    res.json({
      status: 200,
      message: 'Lawyers retrieved successfully',
      data: await withProfileData(lawyers),
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

    // New lawyers go to the end of the public order
    const last = await User.findOne({ role: 'lawyer' }).sort({ sortOrder: -1 }).select('sortOrder').lean();
    const sortOrder = (last?.sortOrder ?? -1) + 1;

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
      sortOrder,
    });
    await lawyer.save();

    let emailSent = true;
    try {
      await sendAccountSetupLink(lawyer);
    } catch (error) {
      emailSent = false;
      console.error('Lawyer setup email failed:', error);
    }

    const savedLawyer = await loadLawyerForAdmin(lawyer._id);

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

// PATCH /api/admin/lawyers/:lawyerId
// Body (all optional): name, email, phone, barId, specialization, designation { en, bn }
export const updateLawyerAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const { lawyerId } = req.params;
    if (!mongoose.isValidObjectId(lawyerId)) {
      return res.status(400).json({ status: 400, message: 'Invalid lawyer ID' });
    }

    const lawyer = await User.findById(lawyerId);
    if (!lawyer || lawyer.role !== 'lawyer') {
      return res.status(404).json({ status: 404, message: 'Lawyer not found' });
    }

    const body = (req.body ?? {}) as Record<string, unknown>;
    const isText = (value: unknown): value is string => typeof value === 'string';
    const previousEmail = lawyer.email;

    if (body.name !== undefined) {
      if (!isText(body.name) || body.name.trim().length < 2 || body.name.trim().length > 100) {
        return res.status(400).json({ status: 400, message: 'Name must be 2 to 100 characters' });
      }
      lawyer.name = body.name.trim();
    }

    if (body.email !== undefined) {
      const email = isText(body.email) ? body.email.trim().toLowerCase() : '';
      if (!EMAIL_PATTERN.test(email) || email.length > 254) {
        return res.status(400).json({ status: 400, message: 'Enter a valid email address' });
      }
      if (email !== lawyer.email) {
        const taken = await User.exists({ email, _id: { $ne: lawyer._id } });
        if (taken) {
          return res.status(409).json({ status: 409, message: 'Another account already uses this email' });
        }
        lawyer.email = email;
      }
    }

    if (body.phone !== undefined) {
      const phone = isText(body.phone) ? body.phone.trim() : '';
      if (!PHONE_PATTERN.test(phone)) {
        return res.status(400).json({ status: 400, message: 'Enter a valid phone number' });
      }
      lawyer.phone = phone;
    }

    if (body.barId !== undefined) {
      const barId = isText(body.barId) ? body.barId.trim() : '';
      if (!barId || barId.length > 50) {
        return res.status(400).json({ status: 400, message: 'Bar ID is required (max 50 characters)' });
      }
      if (barId !== lawyer.barId) {
        const taken = await User.exists({
          role: 'lawyer',
          barId: new RegExp(`^${escapeRegex(barId)}$`, 'i'),
          _id: { $ne: lawyer._id },
        });
        if (taken) {
          return res.status(409).json({ status: 409, message: 'Another lawyer already has this Bar ID' });
        }
        lawyer.barId = barId;
      }
    }

    if (body.specialization !== undefined) {
      // null or "" clears it
      if (body.specialization !== null && (!isText(body.specialization) || body.specialization.trim().length > 200)) {
        return res.status(400).json({ status: 400, message: 'Specialization must be at most 200 characters' });
      }
      const specialization = isText(body.specialization) ? body.specialization.trim() : '';
      lawyer.specialization = specialization || undefined;
    }

    let designation: { en?: string; bn?: string } | undefined;
    if (body.designation !== undefined) {
      const raw = body.designation as Record<string, unknown> | null;
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
        return res.status(400).json({ status: 400, message: 'Designation must be an object with en and bn' });
      }
      designation = {};
      for (const key of ['en', 'bn'] as const) {
        if (raw[key] === undefined) continue;
        if (!isText(raw[key]) || (raw[key] as string).trim().length > 120) {
          return res.status(400).json({ status: 400, message: 'Designation must be at most 120 characters' });
        }
        designation[key] = (raw[key] as string).trim();
      }
    }

    const nameChanged = lawyer.isModified('name');
    const emailChanged = lawyer.isModified('email');
    const barIdChanged = lawyer.isModified('barId');

    await lawyer.save();

    // Keep the public profile in step with the account where they duplicate data
    const set: Record<string, unknown> = {};
    if (nameChanged) Object.assign(set, splitName(lawyer.name));
    if (barIdChanged) set.barNumber = lawyer.barId;
    if (designation?.en !== undefined) set['designation.en'] = designation.en;
    if (designation?.bn !== undefined) set['designation.bn'] = designation.bn;

    if (Object.keys(set).length) {
      const result = await LawyerProfile.updateOne({ userId: lawyer._id }, { $set: set });
      // A designation edit creates the profile if the lawyer never opened theirs
      if (result.matchedCount === 0 && designation && Object.keys(designation).length) {
        await LawyerProfile.create({
          userId: lawyer._id,
          ...splitName(lawyer.name),
          barNumber: lawyer.barId || '',
          joinedAt: lawyer.createdAt || new Date(),
          designation: { en: designation.en ?? '', bn: designation.bn ?? '' },
        }).catch((error) => {
          if (!isDuplicateKeyError(error)) throw error;
        });
      }
    }

    // A contact email that mirrored the login email follows it
    if (emailChanged) {
      await LawyerProfile.updateOne(
        { userId: lawyer._id, contactEmail: previousEmail },
        { $set: { contactEmail: lawyer.email } }
      );
    }

    res.json({
      status: 200,
      message: `${lawyer.name}'s details were updated`,
      data: await loadLawyerForAdmin(lawyer._id),
    });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return res.status(409).json({ status: 409, message: 'Another account already uses this email' });
    }
    console.error('Admin update lawyer error:', error);
    res.status(500).json({ status: 500, message: 'Internal server error' });
  }
};

// PUT /api/admin/lawyers/order  { order: string[] } — lawyer ids in display order.
// Lawyers missing from the list (e.g. added in another tab) keep their relative
// order after the listed ones.
export const reorderLawyersAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const order = req.body?.order;
    if (!Array.isArray(order) || order.length === 0 || !order.every((id) => typeof id === 'string')) {
      return res.status(400).json({ status: 400, message: 'order must be a non-empty array of lawyer IDs' });
    }
    if (new Set(order).size !== order.length) {
      return res.status(400).json({ status: 400, message: 'order contains duplicate IDs' });
    }
    if (!order.every((id: string) => mongoose.isValidObjectId(id))) {
      return res.status(400).json({ status: 400, message: 'order contains an invalid ID' });
    }

    const lawyers = await User.find({ role: 'lawyer' }).select('_id').sort({ sortOrder: 1, name: 1 }).lean();
    const lawyerIds = new Set(lawyers.map((l) => String(l._id)));
    const unknown = (order as string[]).filter((id) => !lawyerIds.has(id));
    if (unknown.length) {
      return res.status(400).json({
        status: 400,
        message: 'Some IDs are not lawyers (the list may be out of date). Reload and try again.',
      });
    }

    const listed = new Set(order as string[]);
    const finalOrder = [
      ...(order as string[]),
      ...lawyers.map((l) => String(l._id)).filter((id) => !listed.has(id)),
    ];

    await User.bulkWrite(
      finalOrder.map((id, index) => ({
        updateOne: { filter: { _id: id, role: 'lawyer' }, update: { $set: { sortOrder: index } } },
      }))
    );

    // Public lawyer lists are fetched client-side from /api/lawyers/public with no
    // frontend cache, so the new order shows on the next page load.
    res.json({
      status: 200,
      message: 'Lawyer order saved. The public site now lists lawyers in this order.',
      data: finalOrder.map((id, index) => ({ _id: id, sortOrder: index })),
    });
  } catch (error) {
    console.error('Admin reorder lawyers error:', error);
    res.status(500).json({ status: 500, message: 'Internal server error' });
  }
};

// Active bookings that have not started yet, soonest first
const findUpcomingConsultations = async (lawyerId: mongoose.Types.ObjectId | string) => {
  const today = parseDateOnly(businessNow().dateKey) as Date;
  const candidates = await Consultation.find({
    lawyerId,
    status: { $in: ACTIVE_STATUSES },
    date: { $gte: today },
  }).populate<{ clientId: { _id: mongoose.Types.ObjectId; name?: string; email?: string } | null }>(
    'clientId',
    'name email'
  );

  return candidates
    .filter((c) => {
      const minutes = toMinutes(c.time);
      return minutes === null || !hasSlotStarted(c.date, minutes);
    })
    .sort((a, b) => a.date.getTime() - b.date.getTime() || (toMinutes(a.time) ?? 0) - (toMinutes(b.time) ?? 0));
};

// GET /api/admin/lawyers/:lawyerId/deletion-impact
export const getLawyerDeletionImpactAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const { lawyerId } = req.params;
    if (!mongoose.isValidObjectId(lawyerId)) {
      return res.status(400).json({ status: 400, message: 'Invalid lawyer ID' });
    }

    const lawyer = await User.findById(lawyerId).select('name email role').lean();
    if (!lawyer || lawyer.role !== 'lawyer') {
      return res.status(404).json({ status: 404, message: 'Lawyer not found' });
    }

    const openFilter = { lawyerId, isArchived: { $ne: true } };
    const [openCases, openCaseList, totalCases, totalConsultations, upcoming, hasProfile, hasAvailability] =
      await Promise.all([
        Case.countDocuments(openFilter),
        Case.find(openFilter).select('caseNumber title status').sort({ updatedAt: -1 }).limit(IMPACT_LIST_LIMIT).lean(),
        Case.countDocuments({ lawyerId }),
        Consultation.countDocuments({ lawyerId }),
        findUpcomingConsultations(String(lawyerId)),
        LawyerProfile.exists({ userId: lawyerId }),
        LawyerAvailability.exists({ lawyerId }),
      ]);

    const affectedClients = new Set(upcoming.map((c) => String(c.clientId?._id ?? ''))).size;

    res.json({
      status: 200,
      message: 'Deletion impact retrieved successfully',
      data: {
        lawyer: { _id: lawyer._id, name: lawyer.name, email: lawyer.email },
        openCases,
        openCaseList: openCaseList.map((c) => ({ _id: c._id, caseNumber: c.caseNumber, title: c.title, status: c.status })),
        totalCases,
        archivedCases: totalCases - openCases,
        upcomingConsultations: upcoming.length,
        upcomingConsultationList: upcoming.slice(0, IMPACT_LIST_LIMIT).map((c) => ({
          _id: c._id,
          date: c.date,
          time: c.time,
          subject: c.subject,
          clientName: c.clientId?.name ?? 'Unknown client',
        })),
        affectedClients,
        pastConsultations: totalConsultations - upcoming.length,
        hasProfile: Boolean(hasProfile),
        hasAvailability: Boolean(hasAvailability),
      },
    });
  } catch (error) {
    console.error('Admin lawyer deletion impact error:', error);
    res.status(500).json({ status: 500, message: 'Internal server error' });
  }
};

const formatAppointmentDate = (date: Date) =>
  date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

// DELETE /api/admin/lawyers/:lawyerId
// Steps run in an order that is safe to retry: the user is deleted last, so a
// failure part-way leaves the lawyer in place and a second attempt finishes the job.
export const deleteLawyerAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const { lawyerId } = req.params;
    if (!mongoose.isValidObjectId(lawyerId)) {
      return res.status(400).json({ status: 400, message: 'Invalid lawyer ID' });
    }

    const lawyer = await User.findById(lawyerId);
    if (!lawyer || lawyer.role !== 'lawyer') {
      return res.status(404).json({ status: 404, message: 'Lawyer not found' });
    }

    const formerLawyer = { name: lawyer.name, email: lawyer.email, barId: lawyer.barId || '' };
    const now = new Date();

    // 1. Cases: open ones move to the archive; all of them keep a copy of the lawyer
    const archived = await Case.updateMany(
      { lawyerId: lawyer._id, isArchived: { $ne: true } },
      {
        $set: {
          isArchived: true,
          archivedAt: now,
          archivedBy: req.user?._id ?? null,
          archiveReason: 'lawyer-deleted',
          archiveNote: `Assigned lawyer ${lawyer.name} was removed from the firm.`,
          formerLawyer,
        },
      }
    );
    await Case.updateMany({ lawyerId: lawyer._id, isArchived: true }, { $set: { formerLawyer } });

    // 2. Upcoming appointments: cancel one by one so the model's slotKey hook
    //    releases each slot, then tell the clients
    const upcoming = await findUpcomingConsultations(lawyer._id);
    const cancelled: typeof upcoming = [];
    for (const consultation of upcoming) {
      consultation.status = 'cancelled';
      consultation.cancellationReason = LAWYER_GONE_REASON;
      consultation.formerLawyerName = lawyer.name;
      try {
        await consultation.save();
        cancelled.push(consultation);
      } catch (error) {
        console.error(`Could not cancel consultation ${consultation._id}:`, error);
      }
    }
    // Past bookings keep the lawyer's name for history views
    await Consultation.updateMany({ lawyerId: lawyer._id, formerLawyerName: { $exists: false } }, {
      $set: { formerLawyerName: lawyer.name },
    });

    // In-app notice is automatic (the bell lists recently changed appointments);
    // email is best-effort and never blocks the delete.
    const bookUrl = `${getFrontendUrl()}/appointment`;
    const emailResults = await Promise.allSettled(
      cancelled
        .filter((c) => c.clientId?.email)
        .map((c) =>
          sendAppointmentCancelledEmail({
            email: c.clientId!.email as string,
            name: c.clientId!.name || 'there',
            subject: c.subject,
            dateLabel: formatAppointmentDate(c.date),
            time: c.time,
            reason: 'The lawyer assigned to this appointment is no longer with the firm.',
            bookUrl,
          })
        )
    );
    const emailFailures = emailResults.filter((r) => r.status === 'rejected');
    emailFailures.forEach((r) => console.error('Appointment cancellation email failed:', (r as PromiseRejectedResult).reason));
    const notifiedClients = new Set(cancelled.map((c) => String(c.clientId?._id ?? ''))).size;

    // 3. Public profile and schedule
    const profile = await LawyerProfile.findOne({ userId: lawyer._id }).select('profileImageUrl').lean();
    if (profile?.profileImageUrl?.includes('/lawweb/profiles/')) {
      const filename = profile.profileImageUrl.split('/').pop() ?? '';
      await cloudinary.uploader.destroy(`lawweb/profiles/${filename.split('.')[0]}`).catch(() => {/* best effort */});
    }
    await Promise.all([
      LawyerProfile.deleteOne({ userId: lawyer._id }),
      LawyerAvailability.deleteOne({ lawyerId: lawyer._id }),
    ]);

    // 4. Sessions, 5. the account itself
    await revokeAllSessions(String(lawyer._id));
    await User.findByIdAndDelete(lawyer._id);

    const summary = {
      archivedCases: archived.modifiedCount,
      cancelledConsultations: cancelled.length,
      notifiedClients,
      emailFailures: emailFailures.length,
    };
    const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

    res.json({
      status: 200,
      message:
        `${lawyer.name} was removed. ${plural(summary.archivedCases, 'case')} moved to the archive, ` +
        `${plural(summary.cancelledConsultations, 'appointment')} cancelled` +
        (summary.cancelledConsultations ? ` and ${plural(notifiedClients, 'client')} notified` : '') +
        (summary.emailFailures ? ` (${plural(summary.emailFailures, 'email')} could not be sent)` : '') +
        '.',
      data: summary,
    });
  } catch (error) {
    console.error('Admin delete lawyer error:', error);
    res.status(500).json({ status: 500, message: 'Internal server error' });
  }
};

export const getLawyerDetailsAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const { lawyerId } = req.params;
    if (!mongoose.isValidObjectId(lawyerId)) {
      return res.status(400).json({ status: 400, message: 'Invalid lawyer ID' });
    }

    const lawyer = await User.findById(lawyerId).select(`${LAWYER_LIST_FIELDS} role`).lean();

    if (!lawyer || lawyer.role !== 'lawyer') {
      return res.status(404).json({ status: 404, message: 'Lawyer not found' });
    }

    const [[withProfile], totalCases, activeCases, totalConsultations] = await Promise.all([
      withProfileData([lawyer]),
      Case.countDocuments({ lawyerId }),
      Case.countDocuments({ lawyerId, status: 'active', isArchived: { $ne: true } }),
      Consultation.countDocuments({ lawyerId }),
    ]);

    res.json({
      status: 200,
      message: 'Lawyer details retrieved successfully',
      data: {
        ...withProfile,
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
      message: `${lawyer.name} is now ${lawyer.isVerified ? 'verified and listed on the public site' : 'unverified and hidden from the public site'}`,
      data: { _id: lawyer._id, isVerified: lawyer.isVerified },
    });
  } catch (error) {
    console.error('Toggle lawyer verification error:', error);
    res.status(500).json({ status: 500, message: 'Internal server error' });
  }
};
