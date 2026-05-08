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
      lawyerId, clientId, clientEmail, clientName, type, title, description,
      nextCourtDate, filingDate, isOnline, priority, courtName, jurisdiction,
      opposingParty, opposingCounsel,
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
      lawyerId: assignedLawyerId,
      type,
      title,
      description,
      priority: priority || 'medium',
      isOnline: isOnline ?? true,
      courtName,
      jurisdiction,
      opposingParty,
      opposingCounsel,
      filingDate: filingDate ? new Date(filingDate) : undefined,
      nextCourtDate: nextCourtDate ? new Date(nextCourtDate) : undefined,
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
    const { status, notes, nextCourtDate, title, description } = req.body;

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
    if (notes !== undefined) caseDoc.notes = notes;
    if (nextCourtDate !== undefined) caseDoc.nextCourtDate = nextCourtDate ? new Date(nextCourtDate) : undefined;
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
