import { Request, Response } from 'express';
import Case from '../models/Case';
import User from '../models/User';

interface AuthRequest extends Request {
  user?: any;
}

export const createCase = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const userRole = req.user?.role;

    if (!userId || (userRole !== 'admin' && userRole !== 'lawyer')) {
      return res.status(403).json({ status: 403, message: 'Only admins or lawyers can create cases' });
    }

    const {
      lawyerId, clientId, clientEmail, clientName, clientPhone, clientWhatsapp,
      type, title, description, nextCourtDate, filingDate, isOnline, priority,
      courtName, jurisdiction, opposingParty, opposingCounsel, stage,
      statute, caseValue, retainerAmount, estimatedFee, retainerPaid,
      referredBy, caseOrigin, witnessNames, evidenceSummary, internalNotes, notes,
    } = req.body;

    if (!clientEmail || !clientName || !type || !title || !description) {
      return res.status(400).json({ status: 400, message: 'Missing required fields' });
    }

    // Lawyers create cases assigned to themselves; admins can specify any lawyerId
    const assignedLawyerId = userRole === 'lawyer' ? userId : lawyerId;

    if (!assignedLawyerId) {
      return res.status(400).json({ status: 400, message: 'lawyerId is required' });
    }

    const lawyer = await User.findById(assignedLawyerId);
    if (!lawyer || lawyer.role !== 'lawyer') {
      return res.status(404).json({ status: 404, message: 'Lawyer not found' });
    }

    const caseDoc = new Case({
      clientId: clientId || null,
      clientEmail,
      clientName,
      clientPhone: clientPhone || undefined,
      clientWhatsapp: clientWhatsapp || undefined,
      lawyerId: assignedLawyerId,
      type,
      title,
      description,
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
      notes: notes || undefined,
    });

    await caseDoc.save();

    res.status(201).json({
      status: 201,
      message: 'Case created successfully',
      data: caseDoc,
    });
  } catch (error) {
    console.error('Create case error:', error);
    res.status(500).json({ status: 500, message: 'Internal server error' });
  }
};

export const getMyCases = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const userRole = req.user?.role;

    if (!userId) {
      return res.status(401).json({ status: 401, message: 'Not authenticated' });
    }

    let cases;

    if (userRole === 'client') {
      cases = await Case.find({ clientId: userId })
        .populate('lawyerId', 'name email barId phone')
        .sort({ createdAt: -1 });
    } else if (userRole === 'lawyer') {
      cases = await Case.find({ lawyerId: userId })
        .populate('clientId', 'name email phone')
        .sort({ createdAt: -1 });
    } else if (userRole === 'admin') {
      cases = await Case.find()
        .populate('lawyerId', 'name email barId')
        .populate('clientId', 'name email')
        .sort({ createdAt: -1 });
    } else {
      return res.status(403).json({ status: 403, message: 'Unauthorized' });
    }

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
    const userId = req.user?._id;
    const userRole = req.user?.role;
    const { caseId } = req.params;

    const caseDoc = await Case.findById(caseId)
      .populate('lawyerId', 'name email barId phone')
      .populate('clientId', 'name email phone');

    if (!caseDoc) {
      return res.status(404).json({ status: 404, message: 'Case not found' });
    }

    const isOwner =
      userRole === 'admin' ||
      caseDoc.lawyerId?._id?.toString() === userId?.toString() ||
      caseDoc.clientId?.toString() === userId?.toString();

    if (!isOwner) {
      return res.status(403).json({ status: 403, message: 'Access denied' });
    }

    res.json({
      status: 200,
      message: 'Case retrieved successfully',
      data: caseDoc,
    });
  } catch (error) {
    console.error('Get case error:', error);
    res.status(500).json({ status: 500, message: 'Internal server error' });
  }
};

export const updateCase = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const userRole = req.user?.role;
    const { caseId } = req.params;
    const {
      status, stage, notes, internalNotes, nextCourtDate, title, description,
      courtName, jurisdiction, opposingParty, opposingCounsel,
      statute, caseValue, retainerAmount, estimatedFee, retainerPaid,
      referredBy, caseOrigin, witnessNames, evidenceSummary,
      clientPhone, clientWhatsapp, priority,
      hearingEntry, documentEntry,
    } = req.body;

    const caseDoc = await Case.findById(caseId);
    if (!caseDoc) {
      return res.status(404).json({ status: 404, message: 'Case not found' });
    }

    const canUpdate =
      userRole === 'admin' ||
      caseDoc.lawyerId.toString() === userId?.toString();

    if (!canUpdate) {
      return res.status(403).json({ status: 403, message: 'Only the assigned lawyer or admin can update this case' });
    }

    if (status) caseDoc.status = status;
    if (stage) caseDoc.stage = stage;
    if (priority) caseDoc.priority = priority;
    if (notes !== undefined) caseDoc.notes = notes;
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
    if (title && userRole === 'admin') caseDoc.title = title;
    if (description && userRole === 'admin') caseDoc.description = description;

    await caseDoc.save();

    res.json({
      status: 200,
      message: 'Case updated successfully',
      data: caseDoc,
    });
  } catch (error) {
    console.error('Update case error:', error);
    res.status(500).json({ status: 500, message: 'Internal server error' });
  }
};

export const deleteCase = async (req: AuthRequest, res: Response) => {
  try {
    const userRole = req.user?.role;
    const { caseId } = req.params;

    if (userRole !== 'admin') {
      return res.status(403).json({ status: 403, message: 'Only admins can delete cases' });
    }

    const caseDoc = await Case.findByIdAndDelete(caseId);
    if (!caseDoc) {
      return res.status(404).json({ status: 404, message: 'Case not found' });
    }

    res.json({
      status: 200,
      message: 'Case deleted successfully',
      data: null,
    });
  } catch (error) {
    console.error('Delete case error:', error);
    res.status(500).json({ status: 500, message: 'Internal server error' });
  }
};

export const trackCasePublic = async (req: Request, res: Response) => {
  try {
    const query = String(req.params.query || '');
    if (!query || query.trim().length < 3) {
      return res.status(400).json({ status: 400, message: 'Please provide a valid case number or email' });
    }

    const q = query.trim();
    const caseDoc = await Case.findOne({
      $or: [
        { caseNumber: q.toUpperCase() },
        { clientEmail: q.toLowerCase() },
      ],
    })
      .populate('lawyerId', 'name barId')
      .select('caseNumber title type status stage priority courtName jurisdiction nextCourtDate filingDate notes lawyerId createdAt updatedAt')
      .lean();

    if (!caseDoc) {
      return res.status(404).json({ status: 404, message: 'No case found with that case number or email.' });
    }

    res.json({ status: 200, message: 'Case found', data: caseDoc });
  } catch (error) {
    console.error('Track case error:', error);
    res.status(500).json({ status: 500, message: 'Internal server error' });
  }
};

export const toggleFeaturedCase = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?._id;
    const userRole = req.user?.role;
    const { caseId } = req.params;

    const caseDoc = await Case.findById(caseId);
    if (!caseDoc) {
      return res.status(404).json({ status: 404, message: 'Case not found' });
    }

    const canToggle =
      userRole === 'admin' ||
      caseDoc.lawyerId.toString() === userId?.toString();

    if (!canToggle) {
      return res.status(403).json({ status: 403, message: 'Access denied' });
    }

    caseDoc.isFeatured = !caseDoc.isFeatured;
    await caseDoc.save();

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
