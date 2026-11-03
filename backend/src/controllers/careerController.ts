import { Response } from 'express';
import mongoose from 'mongoose';
import Career, {
  type EmploymentType,
  type ICareer,
  type WorkplaceType,
} from '../models/Career';

import { recordAudit } from '../utils/audit';
import { parsePagination, toCountMap } from '../utils/pagination';
import { normalizeRichText, richTextToPlain } from '../utils/richText';
import type { AuthedRequest } from '../access/types';

// Career openings. The admin posts them from the dashboard; the public Careers
// page lists the published ones and shows the details as formatted text.
//
// The description, the requirements and the application instructions are rich
// text: the dashboard editor writes HTML and the public page renders it.

type AuthRequest = AuthedRequest;

const DESCRIPTION_MAX = 5000;
const REQUIREMENTS_MAX = 5000;
const INSTRUCTIONS_MAX = 5000;

const LIST_FIELDS = 'title slug department employmentType workplaceType location experience salary deadline status description publishedAt createdAt updatedAt';

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const notFound = (res: Response) => res.status(404).json({ status: 404, message: 'This opening is no longer available' });

const serverError = (res: Response, label: string, error: unknown) => {
  console.error(`${label} error:`, error);
  res.status(500).json({ status: 500, message: 'Internal server error' });
};

/** A date the admin typed (YYYY-MM-DD) as a Date, or null. */
const parseDeadline = (value: unknown): Date | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null || value === '') return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? undefined : date;
};

/**
 * Normalizes a rich-text field. Returns the HTML to store, or an error message
 * when the text is too long or not text at all.
 */
const richField = (value: unknown, label: string, max: number): { ok: true; value: string } | { ok: false; message: string } => {
  if (value === undefined || value === null) return { ok: true, value: '' };
  return normalizeRichText(value, label, max);
};

/** Public: the published openings, newest first, with search and paging. */
export const listPublicCareers = async (req: AuthRequest, res: Response) => {
  try {
    const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 20, maxLimit: 100 });
    const search = typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 100) : '';
    const department = typeof req.query.department === 'string' ? req.query.department.trim().slice(0, 100) : '';

    const filter: Record<string, unknown> = { status: 'published' };
    if (department && department !== 'all') filter.department = department;
    if (search) {
      const pattern = new RegExp(escapeRegex(search), 'i');
      filter.$or = [{ title: pattern }, { department: pattern }, { location: pattern }, { description: pattern }];
    }

    const [careers, total] = await Promise.all([
      Career.find(filter)
        .select(LIST_FIELDS)
        .sort({ publishedAt: -1, createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Career.countDocuments(filter),
    ]);

    res.json({
      status: 200,
      message: 'Career openings retrieved successfully',
      data: careers,
      meta: { total, page, limit },
    });
  } catch (error) {
    serverError(res, 'List public careers', error);
  }
};

/** Public: the departments that have published openings, for the filter chips. */
export const listCareerDepartments = async (_req: AuthRequest, res: Response) => {
  try {
    const rows = await Career.distinct('department', { status: 'published' });
    const departments = rows.filter((d): d is string => typeof d === 'string' && d.trim().length > 0).sort();
    res.json({ status: 200, message: 'Departments retrieved successfully', data: departments });
  } catch (error) {
    serverError(res, 'List career departments', error);
  }
};

/** Public: one opening, with its full details. */
export const getPublicCareer = async (req: AuthRequest, res: Response) => {
  try {
    const { slug } = req.params;
    if (!slug) return notFound(res);

    const career = await Career.findOne({ slug, status: 'published' }).lean();
    if (!career) return notFound(res);

    res.json({ status: 200, message: 'Career opening retrieved successfully', data: career });
  } catch (error) {
    serverError(res, 'Get public career', error);
  }
};

/** Admin: every opening, whatever its status, with per-status counts. */
export const listCareersAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 20, maxLimit: 100 });
    const status = typeof req.query.status === 'string' ? req.query.status : '';
    const search = typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 100) : '';

    const scope: Record<string, unknown> = {};
    if (search) {
      const pattern = new RegExp(escapeRegex(search), 'i');
      scope.$or = [{ title: pattern }, { department: pattern }, { location: pattern }];
    }
    const filter = status && status !== 'all' ? { ...scope, status } : scope;

    const [careers, total, byStatus] = await Promise.all([
      Career.find(filter)
        .select(LIST_FIELDS)
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Career.countDocuments(filter),
      Career.aggregate<{ _id: string; n: number }>([{ $match: scope }, { $group: { _id: '$status', n: { $sum: 1 } } }]),
    ]);

    const counts = toCountMap(byStatus);

    res.json({
      status: 200,
      message: 'Career openings retrieved successfully',
      data: careers,
      meta: {
        total,
        page,
        limit,
        counts: { all: Object.values(counts).reduce((a, b) => a + b, 0), ...counts },
      },
    });
  } catch (error) {
    serverError(res, 'List careers', error);
  }
};

/** Admin: one opening with its full details, for the editor. */
export const getCareerAdmin = async (req: AuthRequest, res: Response) => {
  try {
    if (!mongoose.isValidObjectId(req.params.careerId)) return notFound(res);
    const career = await Career.findById(req.params.careerId).lean();
    if (!career) return notFound(res);
    res.json({ status: 200, message: 'Career opening retrieved successfully', data: career });
  } catch (error) {
    serverError(res, 'Get career', error);
  }
};

export const createCareerAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const body = req.body as Record<string, unknown>;

    const description = richField(body.description, 'Description', DESCRIPTION_MAX);
    if (!description.ok) return res.status(400).json({ status: 400, message: description.message });
    const requirements = richField(body.requirements, 'Requirements', REQUIREMENTS_MAX);
    if (!requirements.ok) return res.status(400).json({ status: 400, message: requirements.message });
    const instructions = richField(body.applicationInstructions, 'Application instructions', INSTRUCTIONS_MAX);
    if (!instructions.ok) return res.status(400).json({ status: 400, message: instructions.message });

    const deadline = parseDeadline(body.deadline);
    if (deadline === undefined) {
      return res.status(400).json({ status: 400, message: 'The closing date is not a valid date' });
    }

    const career = new Career({
      title: String(body.title).trim(),
      department: body.department ? String(body.department).trim() : 'General',
      employmentType: (body.employmentType as string) || 'full-time',
      workplaceType: (body.workplaceType as string) || 'on-site',
      location: body.location ? String(body.location).trim() : 'Dhaka, Bangladesh',
      experience: body.experience ? String(body.experience).trim() : undefined,
      salary: body.salary ? String(body.salary).trim() : undefined,
      deadline: deadline ?? null,
      description: description.value,
      requirements: requirements.value,
      applicationEmail: body.applicationEmail ? String(body.applicationEmail).trim().toLowerCase() : '',
      applicationUrl: body.applicationUrl ? String(body.applicationUrl).trim() : '',
      applicationInstructions: instructions.value,
      status: (body.status as string) || 'draft',
      authorId: req.user?._id,
      authorName: req.user?.name ?? 'Administrator',
    });

    await career.save();

    recordAudit(req, {
      action: career.status === 'published' ? 'career.published' : 'career.created',
      category: 'content',
      targetType: 'career',
      targetId: career._id,
      targetLabel: career.title,
      summary: `Created the "${career.title}" opening (${career.status})`,
      metadata: { status: career.status, department: career.department },
    });

    res.status(201).json({ status: 201, message: 'Opening created successfully', data: career });
  } catch (error) {
    serverError(res, 'Create career', error);
  }
};

export const updateCareerAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const { careerId } = req.params;
    if (!mongoose.isValidObjectId(careerId)) return notFound(res);

    const career = await Career.findById(careerId);
    if (!career) return notFound(res);

    const body = (req.body ?? {}) as Record<string, unknown>;

    const description = richField(body.description, 'Description', DESCRIPTION_MAX);
    if (!description.ok) return res.status(400).json({ status: 400, message: description.message });
    const requirements = richField(body.requirements, 'Requirements', REQUIREMENTS_MAX);
    if (!requirements.ok) return res.status(400).json({ status: 400, message: requirements.message });
    const instructions = richField(body.applicationInstructions, 'Application instructions', INSTRUCTIONS_MAX);
    if (!instructions.ok) return res.status(400).json({ status: 400, message: instructions.message });

    if (body.deadline !== undefined) {
      const deadline = parseDeadline(body.deadline);
      if (deadline === undefined) {
        return res.status(400).json({ status: 400, message: 'The closing date is not a valid date' });
      }
      career.deadline = deadline;
    }

    if (body.title !== undefined) career.title = String(body.title).trim();
    if (body.department !== undefined) career.department = String(body.department).trim() || 'General';
    if (body.employmentType !== undefined) career.employmentType = body.employmentType as EmploymentType;
    if (body.workplaceType !== undefined) career.workplaceType = body.workplaceType as WorkplaceType;
    if (body.location !== undefined) career.location = String(body.location).trim();
    if (body.experience !== undefined) career.experience = String(body.experience).trim();
    if (body.salary !== undefined) career.salary = String(body.salary).trim();
    if (body.description !== undefined) career.description = description.value;
    if (body.requirements !== undefined) career.requirements = requirements.value;
    if (body.applicationEmail !== undefined) career.applicationEmail = String(body.applicationEmail).trim().toLowerCase();
    if (body.applicationUrl !== undefined) career.applicationUrl = String(body.applicationUrl).trim();
    if (body.applicationInstructions !== undefined) career.applicationInstructions = instructions.value;

    const previousStatus = career.status;
    if (body.status !== undefined) career.status = body.status as ICareer['status'];

    const changed = career.modifiedPaths().filter((p) => !p.includes('.'));
    await career.save();

    const published = previousStatus !== 'published' && career.status === 'published';
    recordAudit(req, {
      action: published ? 'career.published' : 'career.updated',
      category: 'content',
      targetType: 'career',
      targetId: career._id,
      targetLabel: career.title,
      summary: published ? `Published the "${career.title}" opening` : `Updated the "${career.title}" opening`,
      metadata: { fields: changed, from: previousStatus, to: career.status },
    });

    res.json({ status: 200, message: 'Opening updated successfully', data: career });
  } catch (error) {
    serverError(res, 'Update career', error);
  }
};

export const deleteCareerAdmin = async (req: AuthRequest, res: Response) => {
  try {
    const { careerId } = req.params;
    if (!mongoose.isValidObjectId(careerId)) return notFound(res);

    const career = await Career.findByIdAndDelete(careerId).lean();
    if (!career) return notFound(res);

    recordAudit(req, {
      action: 'career.deleted',
      category: 'content',
      targetType: 'career',
      targetId: career._id,
      targetLabel: career.title,
      summary: `Deleted the "${career.title}" opening`,
    });

    res.json({ status: 200, message: 'Opening deleted', data: { _id: career._id } });
  } catch (error) {
    serverError(res, 'Delete career', error);
  }
};

/** The plain-text excerpt shown on the public listing card. */
export const careerExcerpt = (career: { description?: string }, max = 180): string =>
  richTextToPlain(career.description ?? '').slice(0, max);
