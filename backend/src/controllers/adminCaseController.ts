import { Request, Response } from 'express';
import mongoose from 'mongoose';
import User from '../models/User';
import Case from '../models/Case';
import { parsePagination, toCountMap } from '../utils/pagination';
import { changedFields, recordAudit } from '../utils/audit';
import { normalizeRichText, RICH_TEXT_LIMITS } from '../utils/richText';
import { can, forbidden } from '../access/policy';
import { forbiddenCaseWrites, projectCase } from '../access/projection';
import type { AuthedRequest as AuthRequest } from '../access/types';

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Legacy documents may lack isArchived, so "active" means "not explicitly archived"
const ACTIVE_FILTER = { isArchived: { $ne: true } };
const ARCHIVED_FILTER = { isArchived: true };

const CASE_POPULATE = [
  // A removed lawyer populates as null, so the list falls back to the formerLawyer copy
  { path: 'lawyerId', select: 'name email barId isBlocked', match: { deletedAt: null } },
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
    const { status, type } = req.query;
    const archived = typeof req.query.archived === 'string' ? req.query.archived : 'false';
    const search = typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 100) : '';
    const { page, limit, skip } = parsePagination(req.query);

    // Everything except the status filter, so the per-status counts stay stable while filtering
    const scope: Record<string, any> = {};
    if (typeof type === 'string' && type) scope.type = type;
    if (search) {
      const rx = new RegExp(escapeRegex(search), 'i');
      scope.$or = [{ caseNumber: rx }, { title: rx }, { clientName: rx }, { clientEmail: rx }];
    }
    const base: Record<string, any> = typeof status === 'string' && status ? { ...scope, status } : { ...scope };

    const archiveFilter = archived === 'all' ? {} : archived === 'true' ? ARCHIVED_FILTER : ACTIVE_FILTER;
    const filter: Record<string, any> = { ...base, ...archiveFilter };

    const [cases, total, activeCount, archivedCount, byStatus] = await Promise.all([
      Case.find(filter).populate(CASE_POPULATE).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit).lean(),
      Case.countDocuments(filter),
      Case.countDocuments({ ...base, ...ACTIVE_FILTER }),
      Case.countDocuments({ ...base, ...ARCHIVED_FILTER }),
      Case.aggregate<{ _id: string; n: number }>([
        { $match: { ...scope, ...archiveFilter } },
        { $group: { _id: '$status', n: { $sum: 1 } } },
      ]),
    ]);

    const statusCounts = toCountMap(byStatus);

    res.json({
      status: 200,
      message: 'Cases retrieved successfully',
      // Finance and confidential fields only for those allowed to see them
      data: cases.map((c) => projectCase(c, req.access!)),
      meta: {
        total,
        page,
        limit,
        // Counts honour status/type/search but not the archived switch, for the tab badges
        counts: { active: activeCount, archived: archivedCount },
        // Counts for the current tab honour type/search but not the status filter, for the stat cards
        statusCounts: { all: Object.values(statusCounts).reduce((a, b) => a + b, 0), ...statusCounts },
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

    // Description and client-visible notes are rich text: store allowlisted HTML only
    const descriptionResult = normalizeRichText(description, 'Description', RICH_TEXT_LIMITS.caseDescription);
    if (!descriptionResult.ok) return res.status(400).json({ status: 400, message: descriptionResult.message });
    if (!descriptionResult.value) {
      return res.status(400).json({ status: 400, message: 'Required fields: clientEmail, clientName, lawyerId, type, title, description' });
    }
    const notesResult = normalizeRichText(notes, 'Notes', RICH_TEXT_LIMITS.caseNotes);
    if (!notesResult.ok) return res.status(400).json({ status: 400, message: notesResult.message });

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
      description: descriptionResult.value,
      isOnline: isOnline ?? true,
      nextCourtDate: nextCourtDate ? new Date(nextCourtDate) : undefined,
      notes: notesResult.value || undefined,
      totalPayment: totalPayment || 0,
    });

    await newCase.save();
    await newCase.populate(CASE_POPULATE);

    recordAudit(req, {
      action: 'case.created',
      category: 'case',
      targetType: 'case',
      targetId: newCase._id,
      targetLabel: newCase.caseNumber,
      summary: `Created case ${newCase.caseNumber} for ${clientName}`,
      metadata: { type, lawyerId: String(lawyerId) },
    });

    res.status(201).json({
      status: 201,
      message: 'Case created successfully',
      data: projectCase(newCase, req.access!),
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
    // Rich-text fields: store allowlisted HTML only
    if (updates.description !== undefined) {
      const result = normalizeRichText(updates.description, 'Description', RICH_TEXT_LIMITS.caseDescription);
      if (!result.ok) return res.status(400).json({ status: 400, message: result.message });
      if (!result.value) return res.status(400).json({ status: 400, message: 'Description is required' });
      updates.description = result.value;
    }
    if (updates.notes !== undefined) {
      const result = normalizeRichText(updates.notes, 'Notes', RICH_TEXT_LIMITS.caseNotes);
      if (!result.ok) return res.status(400).json({ status: 400, message: result.message });
      updates.notes = result.value;
    }

    const existing = await Case.findById(caseId).select(['isArchived', 'caseNumber', ...ADMIN_CASE_UPDATABLE_FIELDS].join(' ')).lean();
    if (!existing) {
      return res.status(404).json({ status: 404, message: 'Case not found' });
    }
    if (existing.isArchived) {
      return res.status(409).json({ status: 409, message: 'Restore the case to edit it' });
    }

    // Each field family needs its own permission; reassigning needs cases.assign
    const blocked = forbiddenCaseWrites(req.access!, existing, updates, { adminForm: true });
    if (blocked.length) {
      return forbidden(res, `You don't have permission to change: ${blocked.join(', ')}`, 'FIELD_FORBIDDEN', { fields: blocked });
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

    const changed = changedFields(existing as unknown as Record<string, unknown>, updates);
    const statusChanged = changed.includes('status');
    recordAudit(req, {
      action: statusChanged ? 'case.status_changed' : 'case.updated',
      category: 'case',
      targetType: 'case',
      targetId: updatedCase._id,
      targetLabel: updatedCase.caseNumber,
      summary: statusChanged
        ? `Changed case ${updatedCase.caseNumber} status from ${existing.status} to ${updatedCase.status}`
        : `Updated case ${updatedCase.caseNumber}`,
      metadata: {
        fields: changed,
        ...(statusChanged ? { from: existing.status, to: updatedCase.status } : {}),
        ...(changed.includes('lawyerId') ? { lawyerReassigned: true } : {}),
      },
    });

    res.json({
      status: 200,
      message: 'Case updated successfully',
      data: projectCase(updatedCase, req.access!),
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

    recordAudit(req, {
      action: 'case.archived',
      category: 'case',
      targetType: 'case',
      targetId: caseDoc._id,
      targetLabel: caseDoc.caseNumber,
      summary: `Archived case ${caseDoc.caseNumber}`,
      metadata: note ? { note: note.slice(0, 200) } : undefined,
    });

    res.json({ status: 200, message: `Case ${caseDoc.caseNumber} archived`, data: projectCase(caseDoc, req.access!) });
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

    // Bringing back a deleted lawyer's case is a super-admin decision, and
    // restoring onto a different lawyer is a reassignment
    if (caseDoc.archiveReason === 'lawyer-deleted' && !req.access!.isSuperAdmin) {
      return forbidden(res, "Only the super-admin can restore a removed lawyer's case.", 'ADMIN_RESTORE_ONLY');
    }
    if (requestedLawyerId && String(requestedLawyerId) !== String(caseDoc.lawyerId) && !can(req.access!, 'cases.assign')) {
      return forbidden(res, "You don't have permission to move a case to another lawyer.");
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

    recordAudit(req, {
      action: 'case.restored',
      category: 'case',
      targetType: 'case',
      targetId: caseDoc._id,
      targetLabel: caseDoc.caseNumber,
      summary: `Restored case ${caseDoc.caseNumber}`,
      metadata: requestedLawyerId ? { lawyerReassigned: true } : undefined,
    });

    res.json({ status: 200, message: `Case ${caseDoc.caseNumber} restored`, data: projectCase(caseDoc, req.access!) });
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

    recordAudit(req, {
      action: 'case.deleted',
      category: 'case',
      targetType: 'case',
      targetId: caseDoc._id,
      targetLabel: caseDoc.caseNumber,
      summary: `Permanently deleted case ${caseDoc.caseNumber}`,
    });

    res.json({ status: 200, message: `Case ${caseDoc.caseNumber} permanently deleted`, data: null });
  } catch (error) {
    console.error('Admin delete case error:', error);
    res.status(500).json({ status: 500, message: 'Internal server error' });
  }
};
