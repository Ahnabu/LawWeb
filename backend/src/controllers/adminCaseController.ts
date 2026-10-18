import { Request, Response } from 'express';
import mongoose from 'mongoose';
import User from '../models/User';
import Case from '../models/Case';

interface AuthRequest extends Request {
  user?: any;
}

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Legacy documents may lack isArchived, so "active" means "not explicitly archived"
const ACTIVE_FILTER = { isArchived: { $ne: true } };
const ARCHIVED_FILTER = { isArchived: true };

const CASE_POPULATE = [
  { path: 'lawyerId', select: 'name email barId isBlocked' },
  { path: 'clientId', select: 'name email' },
  { path: 'archivedBy', select: 'name role' },
];

const LAWYER_UNAVAILABLE_MESSAGE = 'Choose an active lawyer. The selected lawyer does not exist or is blocked.';

// A case can only be assigned to an existing, unblocked lawyer account
const findAssignableLawyer = async (lawyerId: unknown) => {
  const id = lawyerId == null ? '' : String(lawyerId);
  if (!id || !mongoose.isValidObjectId(id)) return null;
  const lawyer = await User.findById(id).select('name email barId role isBlocked');
  if (!lawyer || lawyer.role !== 'lawyer' || lawyer.isBlocked) return null;
  return lawyer;
};

export const getAllCasesAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const { status, type, page = '1', limit = '20' } = req.query;
    const archived = typeof req.query.archived === 'string' ? req.query.archived : 'false';
    const search = typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 100) : '';

    const base: Record<string, any> = {};
    if (typeof status === 'string' && status) base.status = status;
    if (typeof type === 'string' && type) base.type = type;
    if (search) {
      const rx = new RegExp(escapeRegex(search), 'i');
      base.$or = [{ caseNumber: rx }, { title: rx }, { clientName: rx }, { clientEmail: rx }];
    }

    const filter: Record<string, any> =
      archived === 'all'
        ? { ...base }
        : archived === 'true'
          ? { ...base, ...ARCHIVED_FILTER }
          : { ...base, ...ACTIVE_FILTER };

    const pageNum = Math.max(1, Number(page) || 1);
    const limitNum = Math.min(200, Math.max(1, Number(limit) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [cases, total, activeCount, archivedCount] = await Promise.all([
      Case.find(filter).populate(CASE_POPULATE).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
      Case.countDocuments(filter),
      Case.countDocuments({ ...base, ...ACTIVE_FILTER }),
      Case.countDocuments({ ...base, ...ARCHIVED_FILTER }),
    ]);

    res.json({
      status: 200,
      message: 'Cases retrieved successfully',
      data: cases,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        // Counts honour status/type/search but not the archived switch, for the tab badges
        counts: { active: activeCount, archived: archivedCount },
      },
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

    const lawyer = await findAssignableLawyer(lawyerId);
    if (!lawyer) {
      return res.status(400).json({ status: 400, message: LAWYER_UNAVAILABLE_MESSAGE });
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
    await newCase.populate(CASE_POPULATE);

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
    if (!mongoose.isValidObjectId(caseId)) {
      return res.status(404).json({ status: 404, message: 'Case not found' });
    }
    // Only whitelisted fields; never caseNumber, payments history, ids or archive fields
    const updates: Record<string, unknown> = {};
    for (const key of ADMIN_CASE_UPDATABLE_FIELDS) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    const existing = await Case.findById(caseId).select('isArchived lawyerId');
    if (!existing) {
      return res.status(404).json({ status: 404, message: 'Case not found' });
    }
    if (existing.isArchived) {
      return res.status(409).json({ status: 409, message: 'Restore the case to edit it' });
    }

    if (updates.lawyerId !== undefined && String(updates.lawyerId) !== String(existing.lawyerId)) {
      const lawyer = await findAssignableLawyer(updates.lawyerId);
      if (!lawyer) {
        return res.status(400).json({ status: 400, message: LAWYER_UNAVAILABLE_MESSAGE });
      }
    }

    const updatedCase = await Case.findByIdAndUpdate(
      caseId,
      { $set: updates },
      { new: true, runValidators: true }
    ).populate(CASE_POPULATE);

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

export const archiveCaseAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const { caseId } = req.params;
    if (!mongoose.isValidObjectId(caseId)) {
      return res.status(404).json({ status: 404, message: 'Case not found' });
    }
    const note = typeof req.body?.note === 'string' ? req.body.note.trim().slice(0, 500) : '';

    const caseDoc = await Case.findById(caseId);
    if (!caseDoc) {
      return res.status(404).json({ status: 404, message: 'Case not found' });
    }
    if (caseDoc.isArchived) {
      return res.status(409).json({ status: 409, message: 'This case is already archived' });
    }

    caseDoc.isArchived = true;
    caseDoc.archivedAt = new Date();
    caseDoc.archivedBy = req.user._id;
    caseDoc.archiveReason = 'manual';
    caseDoc.archiveNote = note || undefined;
    await caseDoc.save();
    await caseDoc.populate(CASE_POPULATE);

    res.json({ status: 200, message: `Case ${caseDoc.caseNumber} archived`, data: caseDoc });
  } catch (error) {
    console.error('Admin archive case error:', error);
    res.status(500).json({ status: 500, message: 'Internal server error' });
  }
};

export const restoreCaseAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const { caseId } = req.params;
    if (!mongoose.isValidObjectId(caseId)) {
      return res.status(404).json({ status: 404, message: 'Case not found' });
    }
    const requestedLawyerId = req.body?.lawyerId;

    const caseDoc = await Case.findById(caseId);
    if (!caseDoc) {
      return res.status(404).json({ status: 404, message: 'Case not found' });
    }
    if (!caseDoc.isArchived) {
      return res.status(409).json({ status: 409, message: 'This case is not archived' });
    }

    if (requestedLawyerId) {
      const lawyer = await findAssignableLawyer(requestedLawyerId);
      if (!lawyer) {
        return res.status(400).json({ status: 400, message: LAWYER_UNAVAILABLE_MESSAGE });
      }
      caseDoc.lawyerId = lawyer._id as mongoose.Types.ObjectId;
    } else {
      // The original lawyer must still be assignable, otherwise the admin has to pick a new one
      const current = await findAssignableLawyer(caseDoc.lawyerId);
      if (!current) {
        return res.status(400).json({
          status: 400,
          code: 'LAWYER_REQUIRED',
          message: caseDoc.archiveReason === 'lawyer-deleted'
            ? 'The lawyer on this case was deleted. Choose a new lawyer to restore it.'
            : 'The lawyer on this case is no longer available. Choose a new lawyer to restore it.',
        });
      }
    }

    caseDoc.isArchived = false;
    caseDoc.archivedAt = undefined;
    caseDoc.archivedBy = undefined;
    caseDoc.archiveReason = undefined;
    caseDoc.archiveNote = undefined;
    // The snapshot only matters while the case points at a deleted account
    if (requestedLawyerId) caseDoc.formerLawyer = undefined;
    await caseDoc.save();
    await caseDoc.populate(CASE_POPULATE);

    res.json({ status: 200, message: `Case ${caseDoc.caseNumber} restored`, data: caseDoc });
  } catch (error) {
    console.error('Admin restore case error:', error);
    res.status(500).json({ status: 500, message: 'Internal server error' });
  }
};

export const deleteCaseAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const { caseId } = req.params;
    if (!mongoose.isValidObjectId(caseId)) {
      return res.status(404).json({ status: 404, message: 'Case not found' });
    }

    const caseDoc = await Case.findById(caseId).select('caseNumber isArchived');
    if (!caseDoc) {
      return res.status(404).json({ status: 404, message: 'Case not found' });
    }
    // Two-step removal guards against deleting a live case by accident
    if (!caseDoc.isArchived) {
      return res.status(409).json({ status: 409, message: 'Archive the case before deleting it' });
    }

    await Case.deleteOne({ _id: caseDoc._id, isArchived: true });

    res.json({ status: 200, message: `Case ${caseDoc.caseNumber} permanently deleted`, data: null });
  } catch (error) {
    console.error('Admin delete case error:', error);
    res.status(500).json({ status: 500, message: 'Internal server error' });
  }
};
