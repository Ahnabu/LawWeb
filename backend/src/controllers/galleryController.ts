import { Request, Response } from 'express';
import mongoose from 'mongoose';
import GalleryImage, { GALLERY_MAX_IMAGES, type IGalleryText } from '../models/GalleryImage';
import { cloudinary } from '../config/multer.config';
import { recordAudit } from '../utils/audit';

// Photo gallery: the public list, and the admin area (gallery.manage).
// Request shapes are checked by the zod schemas in middleware/validation.ts.

type UploadedFile = Express.Multer.File & { path?: string; filename?: string };
type AuthedReq = Request & { user?: { _id?: unknown } };

const GALLERY_FOLDER = 'lawweb/gallery/';
const PUBLIC_FIELDS = '_id imageUrl title description sortOrder';

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
const isValidId = (id: unknown): id is string => typeof id === 'string' && mongoose.isValidObjectId(id);
const userId = (req: Request) => {
  const id = (req as AuthedReq).user?._id;
  return id && mongoose.isValidObjectId(String(id)) ? String(id) : null;
};

const notFound = (res: Response) => res.status(404).json({ status: 404, message: 'Image not found' });

// A label for the audit log and toasts: the English title, or a placeholder
const labelOf = (image: { title?: Partial<IGalleryText> | null }) => image.title?.en?.trim() || image.title?.bn?.trim() || 'Untitled photo';

// Best effort: a failed delete only leaves an unused file on Cloudinary
const destroyImage = async (publicId?: string | null) => {
  if (!publicId || !publicId.startsWith(GALLERY_FOLDER)) return;
  try {
    await cloudinary.uploader.destroy(publicId, { invalidate: true });
  } catch (error) {
    console.error('Gallery image delete (Cloudinary) failed:', error);
  }
};

// multipart "true"/"false", or a JSON boolean
const parseBool = (value: unknown, fallback: boolean) => {
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === '1' || value === 'on') return true;
  if (value === 'false' || value === '0' || value === 'off') return false;
  return fallback;
};

// ─── Public ───────────────────────────────────────────────────────────────────

// GET /api/gallery — published images in display order
export const listPublicGallery = async (_req: Request, res: Response) => {
  try {
    const images = await GalleryImage.find({ isPublished: true })
      .select(PUBLIC_FIELDS)
      .sort({ sortOrder: 1, createdAt: -1 })
      .limit(GALLERY_MAX_IMAGES)
      .lean();
    res.json({ status: 200, message: 'Gallery retrieved successfully', data: images });
  } catch (error) {
    console.error('Public gallery error:', error);
    res.status(500).json({ status: 500, message: 'Internal server error' });
  }
};

// ─── Admin ────────────────────────────────────────────────────────────────────

// GET /api/admin/gallery — every image, hidden ones included
export const listGalleryAdmin = async (_req: Request, res: Response) => {
  try {
    const images = await GalleryImage.find()
      .sort({ sortOrder: 1, createdAt: -1 })
      .populate('createdBy', 'name')
      .lean();
    const published = images.filter((image) => image.isPublished).length;
    res.json({
      status: 200,
      message: 'Gallery retrieved successfully',
      data: images,
      meta: { total: images.length, published, hidden: images.length - published, max: GALLERY_MAX_IMAGES },
    });
  } catch (error) {
    console.error('Admin gallery list error:', error);
    res.status(500).json({ status: 500, message: 'Internal server error' });
  }
};

// POST /api/admin/gallery — multipart: `image` (the file), optional `isPublished`.
// The file is already on Cloudinary when this runs (multer); every refusal below
// deletes it again. New images go to the top of the order.
export const createGalleryImageAdmin = async (req: Request, res: Response) => {
  const file = req.file as UploadedFile | undefined;
  try {
    if (!file?.path) return res.status(400).json({ status: 400, message: 'No image uploaded' });

    const count = await GalleryImage.countDocuments();
    if (count >= GALLERY_MAX_IMAGES) {
      await destroyImage(file.filename);
      return res.status(409).json({
        status: 409,
        code: 'GALLERY_FULL',
        message: `The gallery holds at most ${GALLERY_MAX_IMAGES} photos. Delete some before adding more.`,
      });
    }

    const first = await GalleryImage.findOne().sort({ sortOrder: 1 }).select('sortOrder').lean();
    const by = userId(req);
    const image = await GalleryImage.create({
      imageUrl: file.path,
      imagePublicId: file.filename,
      isPublished: parseBool(req.body?.isPublished, true),
      sortOrder: first ? first.sortOrder - 1 : 0,
      createdBy: by,
      updatedBy: by,
    });

    recordAudit(req, {
      action: 'gallery.image_added',
      category: 'gallery',
      targetType: 'gallery_image',
      targetId: image._id,
      targetLabel: file.originalname,
      summary: `Added a photo to the gallery${image.isPublished ? '' : ' (hidden)'}`,
      metadata: { url: image.imageUrl, published: image.isPublished },
    });

    res.status(201).json({ status: 201, message: 'Photo added to the gallery', data: image });
  } catch (error) {
    console.error('Admin gallery create error:', error);
    await destroyImage(file?.filename);
    res.status(500).json({ status: 500, message: 'Internal server error' });
  }
};

// PATCH /api/admin/gallery/:imageId — { title?: {en, bn}, description?: {en, bn}, isPublished? }
// A language left out of title/description keeps its current value.
export const updateGalleryImageAdmin = async (req: Request, res: Response) => {
  try {
    const { imageId } = req.params;
    if (!isValidId(imageId)) return res.status(400).json({ status: 400, message: 'Invalid image ID' });

    const image = await GalleryImage.findById(imageId);
    if (!image) return notFound(res);

    const { title, description, isPublished } = req.body ?? {};
    const changed: string[] = [];
    const setText = (field: 'title' | 'description', value: unknown) => {
      if (!value || typeof value !== 'object') return;
      for (const lang of ['en', 'bn'] as const) {
        const next = (value as Record<string, unknown>)[lang];
        if (typeof next !== 'string') continue;
        const clean = next.trim();
        if (clean !== (image[field]?.[lang] ?? '')) {
          image.set(`${field}.${lang}`, clean);
          changed.push(`${field}.${lang}`);
        }
      }
    };
    setText('title', title);
    setText('description', description);

    const wasPublished = image.isPublished;
    if (typeof isPublished === 'boolean' && isPublished !== wasPublished) {
      image.isPublished = isPublished;
      changed.push('isPublished');
    }

    if (changed.length === 0) {
      return res.json({ status: 200, message: 'No changes', data: image.toObject() });
    }

    const by = userId(req);
    if (by) image.set('updatedBy', by);
    await image.save();

    const label = labelOf(image);
    const onlyVisibility = changed.length === 1 && changed[0] === 'isPublished';
    recordAudit(req, {
      action: onlyVisibility ? (image.isPublished ? 'gallery.image_published' : 'gallery.image_hidden') : 'gallery.image_updated',
      category: 'gallery',
      targetType: 'gallery_image',
      targetId: image._id,
      targetLabel: label,
      summary: onlyVisibility
        ? `${image.isPublished ? 'Published' : 'Hid'} gallery photo "${label}"`
        : `Updated gallery photo "${label}"`,
      metadata: { fields: changed },
    });

    const message = onlyVisibility
      ? image.isPublished ? 'Photo is now shown on the gallery page' : 'Photo hidden from the gallery page'
      : 'Photo updated';
    res.json({ status: 200, message, data: image.toObject() });
  } catch (error) {
    console.error('Admin gallery update error:', error);
    res.status(500).json({ status: 500, message: 'Internal server error' });
  }
};

// PUT /api/admin/gallery/order — { order: [imageId, ...] }
// Images missing from `order` (added meanwhile) keep their relative order after it.
export const reorderGalleryAdmin = async (req: Request, res: Response) => {
  try {
    const order: string[] = req.body?.order;
    const images = await GalleryImage.find().select('_id').sort({ sortOrder: 1, createdAt: -1 }).lean();
    const known = new Set(images.map((image) => String(image._id)));
    if (order.some((id) => !known.has(id))) {
      return res.status(400).json({
        status: 400,
        message: 'Some photos no longer exist (the list may be out of date). Reload and try again.',
      });
    }

    const listed = new Set(order);
    const finalOrder = [...order, ...images.map((image) => String(image._id)).filter((id) => !listed.has(id))];
    await GalleryImage.bulkWrite(
      finalOrder.map((id, index) => ({ updateOne: { filter: { _id: id }, update: { $set: { sortOrder: index } } } }))
    );

    recordAudit(req, {
      action: 'gallery.reordered',
      category: 'gallery',
      targetType: 'gallery_image',
      summary: `Reordered ${plural(finalOrder.length, 'gallery photo')}`,
      metadata: { count: finalOrder.length },
    });

    res.json({
      status: 200,
      message: 'Gallery order saved',
      data: finalOrder.map((id, index) => ({ _id: id, sortOrder: index })),
    });
  } catch (error) {
    console.error('Admin gallery reorder error:', error);
    res.status(500).json({ status: 500, message: 'Internal server error' });
  }
};

// DELETE /api/admin/gallery/:imageId — removes the record and its Cloudinary file
export const deleteGalleryImageAdmin = async (req: Request, res: Response) => {
  try {
    const { imageId } = req.params;
    if (!isValidId(imageId)) return res.status(400).json({ status: 400, message: 'Invalid image ID' });

    const image = await GalleryImage.findByIdAndDelete(imageId).lean();
    if (!image) return notFound(res);
    await destroyImage(image.imagePublicId);

    const label = labelOf(image);
    recordAudit(req, {
      action: 'gallery.image_deleted',
      category: 'gallery',
      targetType: 'gallery_image',
      targetId: image._id,
      targetLabel: label,
      summary: `Deleted gallery photo "${label}"`,
      metadata: { url: image.imageUrl, wasPublished: image.isPublished },
    });

    res.json({ status: 200, message: 'Photo deleted' });
  } catch (error) {
    console.error('Admin gallery delete error:', error);
    res.status(500).json({ status: 500, message: 'Internal server error' });
  }
};
