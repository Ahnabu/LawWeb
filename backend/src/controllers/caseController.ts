import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Case from '../models/Case';
import User from '../models/User';
import { markActingFor, recordAudit } from '../utils/audit';
import { normalizeRichText, RICH_TEXT_LIMITS } from '../utils/richText';
import { can, canInWorkspace, hiddenFromStaff, isClientOfCase, refId } from '../access/policy';
import { canWriteCase, forbiddenCaseWrites, forbiddenCreateFields, projectCase } from '../access/projection';
import type { Access, AuthedRequest as AuthRequest } from '../access/types';

// Lawyer/firm-only fields that must never reach a client
const CLIENT_HIDDEN_FIELDS = '-internalNotes -archiveNote -archivedBy -formerLawyer.email -formerLawyer.barId';

// Legacy documents may lack isArchived, so "active" means "not explicitly archived"
const ACTIVE_FILTER = { isArchived: { $ne: true } };

// archived=false (default) | true | all
const archivedFilterFromQuery = (value: unknown): Record<string, unknown> => {
  if (value === 'all') return {};
  if (value === 'true') return { isArchived: true };
  return ACTIVE_FILTER;
};

export const createCase = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const access = req.access;

    // A lawyer always creates for themselves; anyone else needs cases.create for the chosen lawyer
    if (!userId || !access || (access.kind !== 'lawyer' && !can(access, 'cases.create', { lawyerId: req.body?.lawyerId }))) {
      return res.status(403).json({ status: 403, message: 'Only admins or lawyers can create cases' });
    }

    const {
      lawyerId, clientEmail, clientName, clientPhone, clientWhatsapp,
      type, title, description, nextCourtDate, filingDate, isOnline, priority,
      courtName, jurisdiction, opposingParty, opposingCounsel, stage,
      statute, caseValue, retainerAmount, estimatedFee, retainerPaid,
      referredBy, caseOrigin, witnessNames, evidenceSummary, internalNotes, notes,
      totalPayment,
    } = req.body;

    if (!clientEmail || !clientName || !type || !title || !description) {
      return res.status(400).json({ status: 400, message: 'Missing required fields' });
    }

    // Description and client-visible notes are rich text: store allowlisted HTML only
    const descriptionResult = normalizeRichText(description, 'Description', RICH_TEXT_LIMITS.caseDescription);
    if (!descriptionResult.ok) return res.status(400).json({ status: 400, message: descriptionResult.message });
    if (!descriptionResult.value) return res.status(400).json({ status: 400, message: 'Missing required fields' });
    const notesResult = normalizeRichText(notes, 'Notes', RICH_TEXT_LIMITS.caseNotes);
    if (!notesResult.ok) return res.status(400).json({ status: 400, message: notesResult.message });

    // Lawyers create cases assigned to themselves; admins can specify any lawyerId
    const assignedLawyerId = access.kind === 'lawyer' ? userId : lawyerId;

    if (!assignedLawyerId) {
      return res.status(400).json({ status: 400, message: 'lawyerId is required' });
    }

    const lawyer = await User.findById(assignedLawyerId);
    if (!lawyer || lawyer.role !== 'lawyer') {
      return res.status(404).json({ status: 404, message: 'Lawyer not found' });
    }
    if (lawyer.isBlocked) {
      return res.status(400).json({ status: 400, message: 'This lawyer account is blocked and cannot take new cases' });
    }
    markActingFor(req, lawyer._id);

    const blocked = forbiddenCreateFields(access, lawyer._id, req.body);
    if (blocked.length) {
      return res.status(403).json({
        status: 403,
        code: 'FIELD_FORBIDDEN',
        message: `You don't have permission to set: ${blocked.join(', ')}`,
        fields: blocked,
      });
    }

    // The linked client account comes from the email (as on the admin form), never
    // from the body: the linked client sees the case, finance fields included
    const clientUser = await User.findOne({ email: String(clientEmail).trim().toLowerCase(), role: 'client' }).select('_id').lean();

    const caseDoc = new Case({
      clientId: clientUser?._id ?? null,
      clientEmail,
      clientName,
      clientPhone: clientPhone || undefined,
      clientWhatsapp: clientWhatsapp || undefined,
      lawyerId: assignedLawyerId,
      type,
      title,
      description: descriptionResult.value,
      priority: priority || 'medium',
      stage: stage || 'intake',
      isOnline: isOnline ?? true,
      courtName,
      jurisdiction,
      opposingParty,
      opposingCounsel,
      filingDate: filingDate ? new Date(filingDate) : undefined,
      nextCourtDate: nextCourtDate ? new Date(nextCourtDate) : undefined,
      statute: statute || undefined,
      caseValue: caseValue || undefined,
      retainerAmount: retainerAmount || undefined,
      estimatedFee: estimatedFee || undefined,
      retainerPaid: retainerPaid || false,
      referredBy: referredBy || undefined,
      caseOrigin: caseOrigin || undefined,
      witnessNames: witnessNames || [],
      evidenceSummary: evidenceSummary || undefined,
      internalNotes: internalNotes || undefined,
      notes: notesResult.value || undefined,
      totalPayment: totalPayment || 0,
    });

    await caseDoc.save();

    recordAudit(req, {
      action: 'case.created',
      category: 'case',
      targetType: 'case',
      targetId: caseDoc._id,
      targetLabel: caseDoc.caseNumber,
      summary: `Created case ${caseDoc.caseNumber} for ${clientName}`,
      metadata: { type, lawyerId: String(assignedLawyerId) },
    });

    res.status(201).json({
      status: 201,
      message: 'Case created successfully',
      data: projectCase(caseDoc, access),
    });
  } catch (error) {
    console.error('Create case error:', error);
    res.status(500).json({ status: 500, message: 'Internal server error' });
  }
};

// One lawyer's case list (the workspace list). The lawyer isn't populated: it is
// the same one on every case.
export const listCasesInScope = async (
  access: Access,
  scope: Record<string, unknown>,
  archived: unknown
) => {
  const listQuery = Case.find({ ...scope, ...archivedFilterFromQuery(archived) })
    .populate('archivedBy', 'name role')
    .populate('clientId', 'name email phone')
    .sort({ createdAt: -1 });

  const [list, activeCount, archivedCount] = await Promise.all([
    listQuery,
    Case.countDocuments({ ...scope, ...ACTIVE_FILTER }),
    Case.countDocuments({ ...scope, isArchived: true }),
  ]);
  return { cases: list.map((c) => projectCase(c, access)), counts: { active: activeCount, archived: archivedCount } };
};

// A client's own cases. Lawyers and staff use /api/workspace/:lawyerId/cases,
// admins /api/admin/cases.
export const getMyCases = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const access = req.access;

    if (!userId || !access) {
      return res.status(401).json({ status: 401, message: 'Not authenticated' });
    }
    if (access.kind !== 'client') {
      return res.status(403).json({ status: 403, message: 'Unauthorized' });
    }

    // Clients keep their full history; archived cases come back flagged with isArchived
    const cases = await Case.find({ clientId: userId })
      .select(CLIENT_HIDDEN_FIELDS)
      .populate('lawyerId', 'name email barId phone')
      .sort({ createdAt: -1 });

    res.json({
      status: 200,
      message: 'Cases retrieved successfully',
      data: cases,
    });
  } catch (error) {
    console.error('Get cases error:', error);
    res.status(500).json({ status: 500, message: 'Internal server error' });
  }
};

export const getCaseById = async (req: AuthRequest, res: Response) => {
  try {
    const access = req.access;
    const { caseId } = req.params;

    if (!mongoose.isValidObjectId(caseId)) {
      return res.status(404).json({ status: 404, message: 'Case not found' });
    }

    const caseDoc = await Case.findById(caseId)
      .populate('lawyerId', 'name email barId phone')
      .populate('clientId', 'name email phone')
      .populate('archivedBy', 'name role');

    if (!caseDoc || (access && hiddenFromStaff(access, caseDoc.lawyerId))) {
      return res.status(404).json({ status: 404, message: 'Case not found' });
    }

    // A client sees their own case; anyone else needs cases.view for its lawyer
    const allowed = access && (isClientOfCase(access, caseDoc) || can(access, 'cases.view', { lawyerId: caseDoc.lawyerId }));
    if (!access || !allowed) {
      return res.status(403).json({ status: 403, message: 'Access denied' });
    }

    // Strips client-hidden, finance and confidential fields by what the actor may see
    const data = projectCase(caseDoc, access);

    res.json({
      status: 200,
      message: 'Case retrieved successfully',
      data,
    });
  } catch (error) {
    console.error('Get case error:', error);
    res.status(500).json({ status: 500, message: 'Internal server error' });
  }
};

export const updateCase = async (req: AuthRequest, res: Response) => {
  try {
    const access = req.access;
    const { caseId } = req.params;
    const {
      status, stage, notes, internalNotes, nextCourtDate, title, description,
      courtName, jurisdiction, opposingParty, opposingCounsel,
      statute, caseValue, retainerAmount, estimatedFee, retainerPaid,
      referredBy, caseOrigin, witnessNames, evidenceSummary,
      clientPhone, clientWhatsapp, priority,
      hearingEntry, documentEntry,
      totalPayment, paymentEntry, deletePaymentId,
    } = req.body;

    const caseDoc = mongoose.isValidObjectId(caseId) ? await Case.findById(caseId) : null;
    if (!caseDoc || (access && hiddenFromStaff(access, caseDoc.lawyerId))) {
      return res.status(404).json({ status: 404, message: 'Case not found' });
    }

    if (!access || !canWriteCase(access, caseDoc.lawyerId)) {
      return res.status(403).json({ status: 403, message: 'Only the assigned lawyer or admin can update this case' });
    }
    markActingFor(req, caseDoc.lawyerId);

    if (caseDoc.isArchived) {
      return res.status(409).json({ status: 409, message: 'Restore the case to edit it' });
    }

    // Each field family (general, finance, confidential) needs its own permission
    const blocked = forbiddenCaseWrites(access, caseDoc, req.body ?? {});
    if (blocked.length) {
      return res.status(403).json({
        status: 403,
        code: 'FIELD_FORBIDDEN',
        message: `You don't have permission to change: ${blocked.join(', ')}`,
        fields: blocked,
      });
    }

    const previousStatus = caseDoc.status;
    if (status) caseDoc.status = status;
    if (stage) caseDoc.stage = stage;
    if (priority) caseDoc.priority = priority;
    if (notes !== undefined) {
      const result = normalizeRichText(notes, 'Notes', RICH_TEXT_LIMITS.caseNotes);
      if (!result.ok) return res.status(400).json({ status: 400, message: result.message });
      caseDoc.notes = result.value;
    }
    if (internalNotes !== undefined) caseDoc.internalNotes = internalNotes;
    if (nextCourtDate !== undefined) caseDoc.nextCourtDate = nextCourtDate ? new Date(nextCourtDate) : undefined;
    if (courtName !== undefined) caseDoc.courtName = courtName;
    if (jurisdiction !== undefined) caseDoc.jurisdiction = jurisdiction;
    if (opposingParty !== undefined) caseDoc.opposingParty = opposingParty;
    if (opposingCounsel !== undefined) caseDoc.opposingCounsel = opposingCounsel;
    if (statute !== undefined) caseDoc.statute = statute;
    if (caseValue !== undefined) caseDoc.caseValue = caseValue;
    if (retainerAmount !== undefined) caseDoc.retainerAmount = retainerAmount;
    if (estimatedFee !== undefined) caseDoc.estimatedFee = estimatedFee;
    if (retainerPaid !== undefined) caseDoc.retainerPaid = retainerPaid;
    if (referredBy !== undefined) caseDoc.referredBy = referredBy;
    if (caseOrigin !== undefined) caseDoc.caseOrigin = caseOrigin;
    if (witnessNames !== undefined) caseDoc.witnessNames = witnessNames;
    if (evidenceSummary !== undefined) caseDoc.evidenceSummary = evidenceSummary;
    if (clientPhone !== undefined) caseDoc.clientPhone = clientPhone;
    if (clientWhatsapp !== undefined) caseDoc.clientWhatsapp = clientWhatsapp;
    // Append a new hearing entry
    if (hearingEntry) caseDoc.hearingHistory.push({ ...hearingEntry, date: new Date(hearingEntry.date) });
    // Append a new document reference
    if (documentEntry) caseDoc.documents.push({ ...documentEntry, date: documentEntry.date ? new Date(documentEntry.date) : new Date() });
    // Title and description belong to the firm: a lawyer's edits are ignored (not refused)
    if (title && access.isSuperAdmin) caseDoc.title = title;
    if (description && access.isSuperAdmin) {
      const result = normalizeRichText(description, 'Description', RICH_TEXT_LIMITS.caseDescription);
      if (!result.ok) return res.status(400).json({ status: 400, message: result.message });
      if (result.value) caseDoc.description = result.value;
    }

    if (totalPayment !== undefined) caseDoc.totalPayment = totalPayment;
    if (paymentEntry) {
      if (typeof paymentEntry.amount !== 'number' || paymentEntry.amount <= 0) {
        return res.status(400).json({ status: 400, message: 'Invalid payment amount' });
      }
      caseDoc.payments.push({
        amount: paymentEntry.amount,
        date: paymentEntry.date ? new Date(paymentEntry.date) : new Date(),
        details: paymentEntry.details || '',
      });
    }
    if (deletePaymentId) {
      if (!access.isSuperAdmin) {
        return res.status(403).json({ status: 403, message: 'Only admins can delete payment entries' });
      }
      const paymentIndex = caseDoc.payments.findIndex((p: any) => p._id.toString() === deletePaymentId);
      if (paymentIndex > -1) {
        caseDoc.payments.splice(paymentIndex, 1);
      } else {
        return res.status(404).json({ status: 404, message: 'Payment entry not found' });
      }
    }

    const changed = caseDoc.modifiedPaths().filter((p) => !p.includes('.'));
    await caseDoc.save();

    const statusChanged = caseDoc.status !== previousStatus;
    recordAudit(req, {
      action: statusChanged ? 'case.status_changed' : 'case.updated',
      category: 'case',
      targetType: 'case',
      targetId: caseDoc._id,
      targetLabel: caseDoc.caseNumber,
      summary: statusChanged
        ? `Changed case ${caseDoc.caseNumber} status from ${previousStatus} to ${caseDoc.status}`
        : `Updated case ${caseDoc.caseNumber}`,
      metadata: {
        fields: changed,
        ...(statusChanged ? { from: previousStatus, to: caseDoc.status } : {}),
        ...(hearingEntry ? { hearingAdded: true } : {}),
        ...(documentEntry ? { documentAdded: true } : {}),
        ...(paymentEntry ? { paymentAdded: paymentEntry.amount } : {}),
        ...(deletePaymentId ? { paymentDeleted: true } : {}),
      },
    });

    res.json({
      status: 200,
      message: 'Case updated successfully',
      data: projectCase(caseDoc, access),
    });
  } catch (error) {
    console.error('Update case error:', error);
    res.status(500).json({ status: 500, message: 'Internal server error' });
  }
};

export const deleteCase = async (req: AuthRequest, res: Response) => {
  try {
    const { caseId } = req.params;

    // The route already requires the super-admin; kept as a second line of defence
    if (!req.access?.isSuperAdmin) {
      return res.status(403).json({ status: 403, message: 'Only admins can delete cases' });
    }

    if (!mongoose.isValidObjectId(caseId)) {
      return res.status(404).json({ status: 404, message: 'Case not found' });
    }

    const caseDoc = await Case.findById(caseId).select('caseNumber isArchived');
    if (!caseDoc) {
      return res.status(404).json({ status: 404, message: 'Case not found' });
    }
    // Same rule as the admin endpoint: only archived cases can be removed for good
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

    res.json({
      status: 200,
      message: `Case ${caseDoc.caseNumber} permanently deleted`,
      data: null,
    });
  } catch (error) {
    console.error('Delete case error:', error);
    res.status(500).json({ status: 500, message: 'Internal server error' });
  }
};

// Public lookup. Case numbers are sequential (CAS-2026-001), so the number alone
// is guessable; the client's email must match too.
export const trackCasePublic = async (req: Request, res: Response) => {
  try {
    const caseNumber = typeof req.query.caseNumber === 'string' ? req.query.caseNumber.trim().toUpperCase() : '';
    const email = typeof req.query.email === 'string' ? req.query.email.trim().toLowerCase() : '';

    if (!caseNumber || !email || caseNumber.length > 40 || email.length > 254) {
      return res.status(400).json({ status: 400, message: 'Please provide your case number and the email address on the case.' });
    }

    const caseDoc = await Case.findOne({ caseNumber, clientEmail: email })
      // A removed lawyer populates as null; the page then shows formerLawyer.name
      .populate({ path: 'lawyerId', select: 'name barId', match: { deletedAt: null } })
      // Archived cases stay trackable; only the former lawyer's name is exposed, never their contact details
      .select('caseNumber title type status stage priority courtName jurisdiction nextCourtDate filingDate notes lawyerId isArchived archivedAt formerLawyer.name createdAt updatedAt')
      .lean();

    if (!caseDoc) {
      return res.status(404).json({ status: 404, message: 'No case matches that case number and email.' });
    }

    res.json({ status: 200, message: 'Case found', data: caseDoc });
  } catch (error) {
    console.error('Track case error:', error);
    res.status(500).json({ status: 500, message: 'Internal server error' });
  }
};

export const toggleFeaturedCase = async (req: AuthRequest, res: Response) => {
  try {
    const { caseId } = req.params;

    const caseDoc = mongoose.isValidObjectId(caseId) ? await Case.findById(caseId) : null;
    if (!caseDoc || (req.access && hiddenFromStaff(req.access, caseDoc.lawyerId))) {
      return res.status(404).json({ status: 404, message: 'Case not found' });
    }

    if (!req.access || !can(req.access, 'cases.feature', { lawyerId: caseDoc.lawyerId })) {
      return res.status(403).json({ status: 403, message: 'Access denied' });
    }
    markActingFor(req, caseDoc.lawyerId);

    if (caseDoc.isArchived) {
      return res.status(409).json({ status: 409, message: 'Restore the case to edit it' });
    }

    caseDoc.isFeatured = !caseDoc.isFeatured;
    await caseDoc.save();

    recordAudit(req, {
      action: caseDoc.isFeatured ? 'case.featured' : 'case.unfeatured',
      category: 'case',
      targetType: 'case',
      targetId: caseDoc._id,
      targetLabel: caseDoc.caseNumber,
      summary: `${caseDoc.isFeatured ? 'Featured' : 'Unfeatured'} case ${caseDoc.caseNumber}`,
    });

    res.json({
      status: 200,
      message: `Case ${caseDoc.isFeatured ? 'featured' : 'unfeatured'} successfully`,
      data: { isFeatured: caseDoc.isFeatured },
    });
  } catch (error) {
    console.error('Toggle featured case error:', error);
    res.status(500).json({ status: 500, message: 'Internal server error' });
  }
};

// The lawyer's side (the lawyer or their assistants) may archive the lawyer's
// cases, and restore what that side archived. A case the firm archived (or one
// archived because its lawyer was deleted) is an admin decision, so only the
// admin pages can bring it back.
export const archiveMyCase = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const { caseId } = req.params;
    if (!mongoose.isValidObjectId(caseId)) {
      return res.status(404).json({ status: 404, message: 'Case not found' });
    }
    const note = typeof req.body?.note === 'string' ? req.body.note.trim().slice(0, 500) : '';

    const caseDoc = await Case.findById(caseId);
    if (!caseDoc || (req.access && hiddenFromStaff(req.access, caseDoc.lawyerId))) {
      return res.status(404).json({ status: 404, message: 'Case not found' });
    }
    if (!req.access || !canInWorkspace(req.access, 'cases.archive', { lawyerId: caseDoc.lawyerId })) {
      return res.status(403).json({ status: 403, message: 'Only the assigned lawyer can archive this case' });
    }
    markActingFor(req, caseDoc.lawyerId);
    if (caseDoc.isArchived) {
      return res.status(409).json({ status: 409, message: 'This case is already archived' });
    }

    caseDoc.isArchived = true;
    caseDoc.archivedAt = new Date();
    caseDoc.archivedBy = userId;
    caseDoc.archiveReason = 'manual';
    caseDoc.archiveOrigin = 'lawyer';
    caseDoc.archiveNote = note || undefined;
    await caseDoc.save();
    await caseDoc.populate([
      { path: 'clientId', select: 'name email phone' },
      { path: 'archivedBy', select: 'name role' },
    ]);

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
    console.error('Archive case error:', error);
    res.status(500).json({ status: 500, message: 'Internal server error' });
  }
};

export const restoreMyCase = async (req: AuthRequest, res: Response) => {
  try {
    const { caseId } = req.params;
    if (!mongoose.isValidObjectId(caseId)) {
      return res.status(404).json({ status: 404, message: 'Case not found' });
    }

    const caseDoc = await Case.findById(caseId);
    if (!caseDoc || (req.access && hiddenFromStaff(req.access, caseDoc.lawyerId))) {
      return res.status(404).json({ status: 404, message: 'Case not found' });
    }
    if (!req.access || !canInWorkspace(req.access, 'cases.archive', { lawyerId: caseDoc.lawyerId })) {
      return res.status(403).json({ status: 403, message: 'Only the assigned lawyer can restore this case' });
    }
    markActingFor(req, caseDoc.lawyerId);
    if (!caseDoc.isArchived) {
      return res.status(409).json({ status: 409, message: 'This case is not archived' });
    }
    // Archived on the lawyer's side: by the lawyer or an assistant. Cases archived
    // before archiveOrigin existed count when the lawyer archived them.
    const lawyerSideArchive =
      caseDoc.archiveOrigin === 'lawyer' ||
      (caseDoc.archiveOrigin == null && refId(caseDoc.archivedBy) === refId(caseDoc.lawyerId));
    if (caseDoc.archiveReason !== 'manual' || !lawyerSideArchive) {
      return res.status(403).json({
        status: 403,
        code: 'ADMIN_RESTORE_ONLY',
        message: 'This case was archived by an administrator. Ask an admin to restore it.',
      });
    }

    caseDoc.isArchived = false;
    caseDoc.archivedAt = undefined;
    caseDoc.archivedBy = undefined;
    caseDoc.archiveReason = undefined;
    caseDoc.archiveOrigin = undefined;
    caseDoc.archiveNote = undefined;
    await caseDoc.save();
    await caseDoc.populate('clientId', 'name email phone');

    recordAudit(req, {
      action: 'case.restored',
      category: 'case',
      targetType: 'case',
      targetId: caseDoc._id,
      targetLabel: caseDoc.caseNumber,
      summary: `Restored case ${caseDoc.caseNumber}`,
    });

    res.json({ status: 200, message: `Case ${caseDoc.caseNumber} restored`, data: projectCase(caseDoc, req.access!) });
  } catch (error) {
    console.error('Restore case error:', error);
    res.status(500).json({ status: 500, message: 'Internal server error' });
  }
};
