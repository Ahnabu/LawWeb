import { Response } from 'express';
import crypto from 'crypto';
import mongoose from 'mongoose';
import User from '../models/User';
import { forbidden } from '../access/policy';
import type { AuthedRequest } from '../access/types';
import Case from '../models/Case';
import StaffAssignment from '../models/StaffAssignment';
import Consultation from '../models/Consultation';
import LawyerProfile from '../models/LawyerProfile';
import LawyerAvailability from '../models/LawyerAvailability';
import { sendAccountSetupLink, ACCOUNT_SETUP_EXPIRY_HOURS } from './authController';
import { revokeAllSessions } from '../utils/session';
import { recordAudit } from '../utils/audit';
import { sendAppointmentCancelledEmail } from '../utils/email';
import { getFrontendUrl } from '../config/env';
import { ACTIVE_STATUSES, businessNow, hasSlotStarted, parseDateOnly, toMinutes } from '../utils/schedule';

type AuthRequest = AuthedRequest;

// Fields the admin list and the edit form need. Never includes password data.
const LAWYER_LIST_FIELDS =
  'name email phone barId specialization isVerified passwordNeedsChange profileImageUrl sortOrder isBlocked blockedAt blockedReason deletedAt deletionPending createdAt updatedAt';

// Removed lawyers are soft-deleted: kept for history and restore, hidden everywhere else.
// `deletedAt: null` also matches documents written before the field existed.
const CURRENT_LAWYER = { role: 'lawyer' as const, deletedAt: null };
const REMOVED_LAWYER = { role: 'lawyer' as const, deletedAt: { $ne: null } };

// Set as the block reason when removal blocks the account, so a restore knows
// it may lift that block (a lawyer blocked before removal comes back blocked)
const REMOVED_BLOCK_REASON = 'Removed from the firm by an administrator.';

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

// New and restored lawyers go to the end of the public order
const nextSortOrder = async () => {
  const last = await User.findOne(CURRENT_LAWYER).sort({ sortOrder: -1 }).select('sortOrder').lean();
  return (last?.sortOrder ?? -1) + 1;
};

const loadLawyerForAdmin = async (lawyerId: unknown) => {
  const lawyer = await User.findById(lawyerId).select(LAWYER_LIST_FIELDS).lean();
  if (!lawyer) return null;
  const [withProfile] = await withProfileData([lawyer]);
  return withProfile;
};

// GET /api/admin/lawyers?removed=true
export const getAllLawyersAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const removed = req.query.removed === 'true';
    // Current lawyers come in public-site order, so the admin list doubles as the reorder list
    const [lawyers, current, removedCount] = await Promise.all([
      User.find(removed ? REMOVED_LAWYER : CURRENT_LAWYER)
        .select(LAWYER_LIST_FIELDS)
        .sort(removed ? { deletedAt: -1 } : { sortOrder: 1, name: 1 })
        .lean(),
      User.countDocuments(CURRENT_LAWYER),
      User.countDocuments(REMOVED_LAWYER),
    ]);

    res.json({
      status: 200,
      message: 'Lawyers retrieved successfully',
      data: await withProfileData(lawyers),
      meta: { counts: { current, removed: removedCount } },
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
    const existingUser = await User.findOne({ email: normalizedEmail }).select('role name deletedAt').lean();
    if (existingUser) {
      if (existingUser.role === 'lawyer' && existingUser.deletedAt) {
        return res.status(409).json({
          status: 409,
          code: 'LAWYER_REMOVED',
          message: `This email belongs to ${existingUser.name}, a removed lawyer. Restore them from the Removed tab instead.`,
        });
      }
      return res.status(409).json({ status: 409, message: 'A user with this email already exists' });
    }

    const sortOrder = await nextSortOrder();

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

    recordAudit(req, {
      action: 'lawyer.created',
      category: 'lawyer',
      targetType: 'lawyer',
      targetId: lawyer._id,
      targetLabel: lawyer.name,
      summary: `Added lawyer ${lawyer.name}`,
      metadata: { setupEmailSent: emailSent },
    });

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
    if (lawyer.deletedAt) {
      return res.status(409).json({ status: 409, message: 'Restore this lawyer before editing their details.' });
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
        // The login email plus "forgot password" is the account: super-admin only
        if (!req.access?.isSuperAdmin) {
          return forbidden(res, "Only the super-admin can change a lawyer's login email.", 'FIELD_FORBIDDEN', { fields: ['email'] });
        }
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
    const changedAccountFields = ['name', 'email', 'phone', 'barId', 'specialization'].filter((f) => lawyer.isModified(f));

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

    recordAudit(req, {
      action: 'lawyer.updated',
      category: 'lawyer',
      targetType: 'lawyer',
      targetId: lawyer._id,
      targetLabel: lawyer.name,
      summary: `Updated lawyer ${lawyer.name}`,
      metadata: { fields: [...changedAccountFields, ...(designation ? ['designation'] : [])] },
    });

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

    const lawyers = await User.find(CURRENT_LAWYER).select('_id').sort({ sortOrder: 1, name: 1 }).lean();
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
        updateOne: { filter: { _id: id, ...CURRENT_LAWYER }, update: { $set: { sortOrder: index } } },
      }))
    );

    recordAudit(req, {
      action: 'lawyer.reordered',
      category: 'lawyer',
      targetType: 'lawyer',
      summary: `Reordered ${plural(finalOrder.length, 'lawyer')} on the public site`,
      metadata: { count: finalOrder.length },
    });

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
    const [openCases, openCaseList, totalCases, totalConsultations, upcoming, hasProfile, hasAvailability, assistantCount] =
      await Promise.all([
        Case.countDocuments(openFilter),
        Case.find(openFilter).select('caseNumber title status').sort({ updatedAt: -1 }).limit(IMPACT_LIST_LIMIT).lean(),
        Case.countDocuments({ lawyerId }),
        Consultation.countDocuments({ lawyerId }),
        findUpcomingConsultations(String(lawyerId)),
        LawyerProfile.exists({ userId: lawyerId }),
        LawyerAvailability.exists({ lawyerId }),
        // Their assistants lose access while the lawyer is removed, and get it back on restore
        StaffAssignment.countDocuments({ lawyerId }),
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
        assistantCount,
      },
    });
  } catch (error) {
    console.error('Admin lawyer deletion impact error:', error);
    res.status(500).json({ status: 500, message: 'Internal server error' });
  }
};

const formatAppointmentDate = (date: Date) =>
  date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

// Archives open cases, cancels upcoming bookings and signs the lawyer out.
// Every step skips work that is already done, so running it again is safe.
const runRemovalCleanup = async (
  lawyer: { _id: mongoose.Types.ObjectId; name: string; email: string; barId?: string },
  adminId: mongoose.Types.ObjectId | null
) => {
  const formerLawyer = { name: lawyer.name, email: lawyer.email, barId: lawyer.barId || '' };

  // 1. Cases: open ones move to the archive; all of them keep a copy of the lawyer
  const archived = await Case.updateMany(
    { lawyerId: lawyer._id, isArchived: { $ne: true } },
    {
      $set: {
        isArchived: true,
        archivedAt: new Date(),
        archivedBy: adminId,
        archiveReason: 'lawyer-deleted',
        archiveOrigin: 'firm',
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
  let cancelFailures = 0;
  for (const consultation of upcoming) {
    consultation.status = 'cancelled';
    consultation.cancellationReason = LAWYER_GONE_REASON;
    consultation.formerLawyerName = lawyer.name;
    try {
      await consultation.save();
      cancelled.push(consultation);
    } catch (error) {
      cancelFailures += 1;
      console.error(`Could not cancel consultation ${consultation._id}:`, error);
    }
  }
  // Past bookings keep the lawyer's name for history views
  await Consultation.updateMany({ lawyerId: lawyer._id, formerLawyerName: { $exists: false } }, {
    $set: { formerLawyerName: lawyer.name },
  });

  // In-app notice is automatic (the bell lists recently changed appointments);
  // email is best-effort and never blocks the removal.
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

  // 3. Any session that outlived the tokenVersion bump
  await revokeAllSessions(String(lawyer._id));

  return {
    archivedCases: archived.modifiedCount,
    cancelledConsultations: cancelled.length,
    notifiedClients: new Set(cancelled.map((c) => String(c.clientId?._id ?? ''))).size,
    emailFailures: emailFailures.length,
    cancelFailures,
  };
};

// DELETE /api/admin/lawyers/:lawyerId — soft delete ("remove from the firm").
// The removal itself is one atomic write on the account: from that moment the
// lawyer cannot sign in, be booked or be assigned, and is hidden from every list.
// The account, public profile, photo and availability are kept so a restore is
// possible. The clean-up that follows is idempotent; until it has finished the
// account carries deletionPending, and calling this endpoint again finishes it.
export const deleteLawyerAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const { lawyerId } = req.params;
    if (!mongoose.isValidObjectId(lawyerId)) {
      return res.status(400).json({ status: 400, message: 'Invalid lawyer ID' });
    }

    const lawyer = await User.findById(lawyerId).select('name email barId role isBlocked deletedAt deletionPending');
    if (!lawyer || lawyer.role !== 'lawyer') {
      return res.status(404).json({ status: 404, message: 'Lawyer not found' });
    }
    if (lawyer.deletedAt && !lawyer.deletionPending) {
      return res.status(409).json({ status: 409, message: `${lawyer.name} has already been removed.` });
    }

    const isRetry = Boolean(lawyer.deletedAt);
    if (!isRetry) {
      const now = new Date();
      // The deletedAt: null condition makes a double-submit remove the lawyer only once
      const marked = await User.findOneAndUpdate(
        { _id: lawyer._id, deletedAt: null },
        {
          $set: {
            deletedAt: now,
            deletedBy: req.user?._id ?? null,
            deletionPending: true,
            isBlocked: true,
            // A lawyer who was already blocked keeps that block's date and reason
            ...(lawyer.isBlocked ? {} : { blockedAt: now, blockedReason: REMOVED_BLOCK_REASON }),
          },
          // Every access token already issued stops working at once
          $inc: { tokenVersion: 1 },
        },
        { returnDocument: 'after' }
      );
      if (!marked) {
        return res.status(409).json({ status: 409, message: `${lawyer.name} is already being removed.` });
      }
    }

    let summary: Awaited<ReturnType<typeof runRemovalCleanup>>;
    try {
      summary = await runRemovalCleanup(lawyer, req.user?._id ?? null);
    } catch (error) {
      console.error('Lawyer removal clean-up error:', error);
      return res.status(500).json({
        status: 500,
        code: 'CLEANUP_INCOMPLETE',
        message: `${lawyer.name} was removed and can no longer sign in, but archiving their cases or cancelling their appointments did not finish. Open the Removed tab and choose "Finish clean-up".`,
      });
    }

    // An appointment that could not be cancelled keeps the clean-up open for a retry
    const pending = summary.cancelFailures > 0;
    if (!pending) {
      await User.updateOne({ _id: lawyer._id }, { $unset: { deletionPending: 1 } });
    }

    recordAudit(req, {
      action: isRetry ? 'lawyer.removal_retried' : 'lawyer.archived',
      category: 'lawyer',
      targetType: 'lawyer',
      targetId: lawyer._id,
      targetLabel: lawyer.name,
      summary: isRetry ? `Finished removal clean-up for lawyer ${lawyer.name}` : `Removed lawyer ${lawyer.name} from the firm`,
      metadata: {
        archivedCases: summary.archivedCases,
        cancelledConsultations: summary.cancelledConsultations,
        pending,
      },
    });

    res.json({
      status: 200,
      message:
        `${lawyer.name} was removed. ${plural(summary.archivedCases, 'case')} moved to the archive, ` +
        `${plural(summary.cancelledConsultations, 'appointment')} cancelled` +
        (summary.cancelledConsultations ? ` and ${plural(summary.notifiedClients, 'client')} notified` : '') +
        (summary.emailFailures ? ` (${plural(summary.emailFailures, 'email')} could not be sent)` : '') +
        '.' +
        (pending
          ? ` ${plural(summary.cancelFailures, 'appointment')} could not be cancelled; use "Finish clean-up" in the Removed tab to try again.`
          : ''),
      data: { ...summary, pending },
    });
  } catch (error) {
    console.error('Admin delete lawyer error:', error);
    res.status(500).json({ status: 500, message: 'Internal server error' });
  }
};

// PATCH /api/admin/lawyers/:lawyerId/restore
// Brings a removed lawyer back. Their cases stay archived and cancelled
// appointments stay cancelled; the admin restores the cases they should keep.
export const restoreLawyerAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const { lawyerId } = req.params;
    if (!mongoose.isValidObjectId(lawyerId)) {
      return res.status(400).json({ status: 400, message: 'Invalid lawyer ID' });
    }

    const lawyer = await User.findById(lawyerId).select('name role deletedAt blockedReason');
    if (!lawyer || lawyer.role !== 'lawyer') {
      return res.status(404).json({ status: 404, message: 'Lawyer not found' });
    }
    if (!lawyer.deletedAt) {
      return res.status(409).json({ status: 409, message: `${lawyer.name} has not been removed.` });
    }

    const liftBlock = lawyer.blockedReason === REMOVED_BLOCK_REASON;
    const restored = await User.findOneAndUpdate(
      { _id: lawyer._id, deletedAt: { $ne: null } },
      {
        $set: {
          deletedAt: null,
          deletedBy: null,
          sortOrder: await nextSortOrder(),
          ...(liftBlock ? { isBlocked: false } : {}),
        },
        $unset: { deletionPending: 1, ...(liftBlock ? { blockedAt: 1, blockedReason: 1 } : {}) },
      },
      { returnDocument: 'after' }
    );
    if (!restored) {
      return res.status(409).json({ status: 409, message: `${lawyer.name} has already been restored.` });
    }

    const archivedCases = await Case.countDocuments({ lawyerId: lawyer._id, isArchived: true });

    recordAudit(req, {
      action: 'lawyer.restored',
      category: 'lawyer',
      targetType: 'lawyer',
      targetId: lawyer._id,
      targetLabel: lawyer.name,
      summary: `Restored lawyer ${lawyer.name}`,
      metadata: { blockLifted: liftBlock },
    });

    res.json({
      status: 200,
      message:
        `${lawyer.name} was restored${liftBlock ? ' and can sign in again' : ' but stays blocked, as before the removal'}.` +
        (archivedCases
          ? ` Their ${plural(archivedCases, 'archived case')} stay in the Archive; restore the ones they should keep.`
          : ''),
      data: await loadLawyerForAdmin(lawyer._id),
    });
  } catch (error) {
    console.error('Admin restore lawyer error:', error);
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

    const [[withProfile], totalCases, activeCases, totalConsultations, assignments] = await Promise.all([
      withProfileData([lawyer]),
      Case.countDocuments({ lawyerId }),
      Case.countDocuments({ lawyerId, status: 'active', isArchived: { $ne: true } }),
      Consultation.countDocuments({ lawyerId }),
      StaffAssignment.find({ lawyerId }).populate('staffId', 'name').sort({ createdAt: 1 }).lean(),
    ]);
    // Staff who assist this lawyer (managed on the Team page)
    const assistants = assignments.flatMap((a) => {
      const staff = a.staffId as unknown as { _id: unknown; name: string } | null;
      return staff ? [{ staffId: staff._id, name: staff.name, permissions: a.permissions }] : [];
    });

    res.json({
      status: 200,
      message: 'Lawyer details retrieved successfully',
      data: {
        ...withProfile,
        stats: { totalCases, activeCases, totalConsultations },
        assistants,
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

    if (lawyer.deletedAt) {
      return res.status(409).json({ status: 409, message: 'Restore this lawyer before changing their verification.' });
    }

    lawyer.isVerified = !lawyer.isVerified;
    await lawyer.save();

    recordAudit(req, {
      action: lawyer.isVerified ? 'lawyer.verified' : 'lawyer.unverified',
      category: 'lawyer',
      targetType: 'lawyer',
      targetId: lawyer._id,
      targetLabel: lawyer.name,
      summary: `${lawyer.isVerified ? 'Verified' : 'Unverified'} lawyer ${lawyer.name}`,
    });

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
