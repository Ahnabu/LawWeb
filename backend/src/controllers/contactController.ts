import { Request, Response } from 'express';
import mongoose from 'mongoose';
import ContactMessage, { CONTACT_MESSAGE_STATUSES, type ContactMessageStatus } from '../models/ContactMessage';
import { parsePagination, toCountMap } from '../utils/pagination';
import { recordAudit } from '../utils/audit';

// ─── Public ───────────────────────────────────────────────────────────────────

// POST /api/contact — body already validated by contactMessageSchema
export const submitContactMessage = async (req: Request, res: Response) => {
  try {
    const { name, email, phone, subject, message, website } = req.body;

    // Honeypot: real visitors never see this field. Pretend it worked so bots don't retry.
    if (website) {
      return res.status(201).json({ status: 201, message: 'Message sent successfully' });
    }

    const created = await ContactMessage.create({
      name,
      email,
      phone: phone || undefined,
      subject: subject || undefined,
      message,
    });

    // The public form has no session: the visitor is logged as an anonymous actor
    recordAudit(req, {
      actor: { name, email, role: 'anonymous' },
      action: 'contact.message_received',
      category: 'contact',
      targetType: 'contact_message',
      targetId: created._id,
      targetLabel: subject || `Message from ${name}`,
      summary: `Contact message received from ${name}`,
    });

    res.status(201).json({ status: 201, message: 'Message sent successfully' });
  } catch (error) {
    console.error('Submit contact message error:', error);
    res.status(500).json({ status: 500, message: 'Internal server error' });
  }
};

// ─── Admin ────────────────────────────────────────────────────────────────────

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const isValidId = (id: unknown): id is string => typeof id === 'string' && mongoose.isValidObjectId(id);
const isStatus = (value: unknown): value is ContactMessageStatus =>
  typeof value === 'string' && (CONTACT_MESSAGE_STATUSES as readonly string[]).includes(value);

const invalidId = (res: Response) => res.status(400).json({ status: 400, message: 'Invalid message ID' });
const notFound = (res: Response) => res.status(404).json({ status: 404, message: 'Message not found' });

// GET /api/admin/messages?status=&search=&page=&limit=
// "all" is the inbox: every message except archived ones.
export const listContactMessagesAdmin = async (req: Request, res: Response) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const status = isStatus(req.query.status) ? req.query.status : 'all';
    const search = typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 100) : '';

    const base: Record<string, unknown> = {};
    if (search) {
      const pattern = new RegExp(escapeRegex(search), 'i');
      base.$or = [{ name: pattern }, { email: pattern }, { phone: pattern }, { subject: pattern }, { message: pattern }];
    }
    const filter: Record<string, unknown> = { ...base, status: status === 'all' ? { $ne: 'archived' } : status };

    // Counts follow the search but not the status tab
    const [messages, total, grouped] = await Promise.all([
      ContactMessage.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      ContactMessage.countDocuments(filter),
      ContactMessage.aggregate<{ _id: string; n: number }>([{ $match: base }, { $group: { _id: '$status', n: { $sum: 1 } } }]),
    ]);
    const byStatus = toCountMap(grouped);
    const counts = {
      all: (byStatus.new ?? 0) + (byStatus.read ?? 0),
      new: byStatus.new ?? 0,
      read: byStatus.read ?? 0,
      archived: byStatus.archived ?? 0,
    };

    res.json({
      status: 200,
      message: 'Messages retrieved successfully',
      data: messages,
      meta: { total, page, limit, counts },
    });
  } catch (error) {
    console.error('Admin list contact messages error:', error);
    res.status(500).json({ status: 500, message: 'Internal server error' });
  }
};

// PATCH /api/admin/messages/:messageId — { status }
export const updateContactMessageAdmin = async (req: Request, res: Response) => {
  try {
    const { messageId } = req.params;
    if (!isValidId(messageId)) return invalidId(res);
    const { status } = req.body ?? {};
    if (!isStatus(status)) {
      return res.status(400).json({ status: 400, message: `Status must be one of: ${CONTACT_MESSAGE_STATUSES.join(', ')}` });
    }

    const existing = await ContactMessage.findById(messageId).select('readAt').lean();
    if (!existing) return notFound(res);

    // Keep the first read time when archiving an already read message
    const update =
      status === 'new'
        ? { status, $unset: { readAt: 1 } }
        : { status, ...(existing.readAt ? {} : { readAt: new Date() }) };

    const message = await ContactMessage.findByIdAndUpdate(messageId, update, { new: true }).lean();
    if (!message) return notFound(res);

    const labels: Record<ContactMessageStatus, string> = {
      new: 'Marked as unread',
      read: 'Marked as read',
      archived: 'Message archived',
    };
    recordAudit(req, {
      action: `contact.message_${status === 'new' ? 'unread' : status}`,
      category: 'contact',
      targetType: 'contact_message',
      targetId: message._id,
      targetLabel: message.subject || `Message from ${message.name}`,
      summary: `${labels[status]}: message from ${message.name}`,
      metadata: { to: status },
    });

    res.json({ status: 200, message: labels[status], data: message });
  } catch (error) {
    console.error('Admin update contact message error:', error);
    res.status(500).json({ status: 500, message: 'Internal server error' });
  }
};

// DELETE /api/admin/messages/:messageId
export const deleteContactMessageAdmin = async (req: Request, res: Response) => {
  try {
    const { messageId } = req.params;
    if (!isValidId(messageId)) return invalidId(res);

    const deleted = await ContactMessage.findByIdAndDelete(messageId).lean();
    if (!deleted) return notFound(res);

    recordAudit(req, {
      action: 'contact.message_deleted',
      category: 'contact',
      targetType: 'contact_message',
      targetId: deleted._id,
      targetLabel: deleted.subject || `Message from ${deleted.name}`,
      summary: `Deleted contact message from ${deleted.name}`,
    });

    res.json({ status: 200, message: 'Message deleted', data: { _id: deleted._id } });
  } catch (error) {
    console.error('Admin delete contact message error:', error);
    res.status(500).json({ status: 500, message: 'Internal server error' });
  }
};
