import { Response } from 'express';
import mongoose from 'mongoose';
import Case, { CaseStatus } from '../models/Case';
import Consultation from '../models/Consultation';
import { createCase, listCasesInScope } from './caseController';
import { listConsultationsInScope } from './consultationController';
import { readAvailability, writeAvailability } from './lawyerController';
import { readLawyerProfile, writeLawyerProfile, writeProfileImage } from './lawyerProfileController';
import { consultationFeeOf } from '../utils/consultationFee';
import type { ILawyerProfile } from '../models/LawyerProfile';
import { can } from '../access/policy';
import type { AuthedRequest } from '../access/types';

// One lawyer's work, for the lawyer ('me') and their assistants
// (routes/workspace.ts). resolveWorkspace has set req.workspace, and the route
// has checked the permission, before any handler here runs.

type WorkspaceRequest = AuthedRequest & { workspace: NonNullable<AuthedRequest['workspace']> };

const lawyerOf = (req: WorkspaceRequest) => ({ _id: req.workspace.lawyerId, name: req.workspace.lawyerName });
const lawyerFilter = (req: WorkspaceRequest) => ({ lawyerId: new mongoose.Types.ObjectId(req.workspace.lawyerId) });

const serverError = (res: Response, label: string, error: unknown) => {
  console.error(`${label} error:`, error);
  res.status(500).json({ status: 500, message: 'Internal server error' });
};

// GET /cases?archived=false|true|all — same shape as the lawyer's /api/cases/my-cases
export const getWorkspaceCases = async (req: WorkspaceRequest, res: Response) => {
  try {
    const { cases, counts } = await listCasesInScope(req.access!, lawyerFilter(req), req.query.archived);
    res.json({ status: 200, message: 'Cases retrieved successfully', data: cases, meta: { counts } });
  } catch (error) {
    serverError(res, 'Workspace cases', error);
  }
};

// POST /cases — always for the workspace lawyer
export const createWorkspaceCase = (req: WorkspaceRequest, res: Response) => {
  req.body = { ...(req.body ?? {}), lawyerId: req.workspace.lawyerId };
  return createCase(req, res);
};

// GET /consultations — same shape as the lawyer's /api/consultations/my-consultations
export const getWorkspaceConsultations = async (req: WorkspaceRequest, res: Response) => {
  try {
    res.json({ consultations: await listConsultationsInScope(lawyerFilter(req)) });
  } catch (error) {
    serverError(res, 'Workspace consultations', error);
  }
};

export const getWorkspaceAvailability = async (req: WorkspaceRequest, res: Response) => {
  try {
    const availability = await readAvailability(req.workspace.lawyerId);
    res.json({ status: 200, message: 'Availability retrieved successfully', data: availability });
  } catch (error) {
    serverError(res, 'Workspace availability', error);
  }
};

export const updateWorkspaceAvailability = async (req: WorkspaceRequest, res: Response) => {
  try {
    const result = await writeAvailability(req, lawyerOf(req), req.body ?? {});
    if (!result.ok) return res.status(400).json({ status: 400, message: result.message });
    res.json({ status: 200, message: 'Availability updated successfully', data: result.availability });
  } catch (error) {
    serverError(res, 'Workspace update availability', error);
  }
};

// The form edits consultationFee only, so the legacy hourlyRate is folded into it
const withFee = (profile: ILawyerProfile | null) => {
  if (!profile) return profile;
  const { hourlyRate: _hourlyRate, ...rest } = profile.toObject();
  return { ...rest, consultationFee: consultationFeeOf(profile) };
};

export const getWorkspaceProfile = async (req: WorkspaceRequest, res: Response) => {
  try {
    const profile = await readLawyerProfile(req.workspace.lawyerId);
    res.json({ status: 200, message: 'Profile retrieved successfully', data: withFee(profile) });
  } catch (error) {
    serverError(res, 'Workspace profile', error);
  }
};

export const updateWorkspaceProfile = async (req: WorkspaceRequest, res: Response) => {
  try {
    const result = await writeLawyerProfile(req, lawyerOf(req), req.body ?? {});
    if (!result.ok) return res.status(400).json({ status: 400, message: result.message });
    res.json({ status: 200, message: 'Profile updated successfully', data: withFee(result.profile) });
  } catch (error) {
    serverError(res, 'Workspace update profile', error);
  }
};

export const uploadWorkspaceProfileImage = async (req: WorkspaceRequest, res: Response) => {
  try {
    const file = req.file as Express.Multer.File & { path: string };
    if (!file) return res.status(400).json({ status: 400, message: 'No image file provided' });
    const imageUrl = await writeProfileImage(req, lawyerOf(req), file);
    res.json({ status: 200, message: 'Profile image uploaded successfully', data: { profileImageUrl: imageUrl } });
  } catch (error) {
    serverError(res, 'Workspace upload profile image', error);
  }
};

const RESOLVED_CASE_STATUSES: CaseStatus[] = ['closed', 'won', 'lost'];

// GET /overview — the dashboard home's numbers. Each part is present only when
// the actor may see it (cases.view / appointments.view for this lawyer).
export const getWorkspaceOverview = async (req: WorkspaceRequest, res: Response) => {
  try {
    const ctx = { lawyerId: req.workspace.lawyerId };
    const filter = lawyerFilter(req);
    const showCases = can(req.access!, 'cases.view', ctx);
    const showAppointments = can(req.access!, 'appointments.view', ctx);
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const [caseCounts, appointmentCounts, upcoming] = await Promise.all([
      showCases
        ? Promise.all([
          Case.countDocuments({ ...filter, isArchived: { $ne: true }, status: { $nin: RESOLVED_CASE_STATUSES } }),
          Case.countDocuments({ ...filter, isArchived: { $ne: true }, status: { $in: RESOLVED_CASE_STATUSES } }),
        ])
        : null,
      showAppointments
        ? Consultation.aggregate<{ _id: string; n: number }>([{ $match: filter }, { $group: { _id: '$status', n: { $sum: 1 } } }])
        : null,
      showAppointments
        ? Consultation.find({ ...filter, status: { $in: ['scheduled', 'rescheduled'] }, date: { $gte: today } })
          .populate('clientId', 'name')
          .select('date time subject status lawyerConfirmed meetingMode clientId')
          .sort({ date: 1, time: 1 })
          .limit(5)
          .lean()
        : null,
    ]);

    const byStatus = new Map((appointmentCounts ?? []).map((row) => [row._id, row.n]));
    res.json({
      status: 200,
      message: 'Overview retrieved successfully',
      data: {
        lawyer: { _id: req.workspace.lawyerId, name: req.workspace.lawyerName },
        ...(caseCounts ? { cases: { active: caseCounts[0], resolved: caseCounts[1] } } : {}),
        ...(appointmentCounts
          ? {
            appointments: {
              total: [...byStatus.values()].reduce((sum, n) => sum + n, 0),
              pending: (byStatus.get('scheduled') ?? 0) + (byStatus.get('rescheduled') ?? 0),
              completed: byStatus.get('completed') ?? 0,
              upcoming,
            },
          }
          : {}),
      },
    });
  } catch (error) {
    serverError(res, 'Workspace overview', error);
  }
};
