import mongoose, { Schema, Document } from 'mongoose';

// Messages sent from the public Contact page; read by admins in the dashboard.
export const CONTACT_MESSAGE_STATUSES = ['new', 'read', 'archived'] as const;
export type ContactMessageStatus = (typeof CONTACT_MESSAGE_STATUSES)[number];

export interface IContactMessage extends Document {
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
  status: ContactMessageStatus;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ContactMessageSchema: Schema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    phone: { type: String, trim: true, maxlength: 30 },
    subject: { type: String, trim: true, maxlength: 150 },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    status: { type: String, enum: CONTACT_MESSAGE_STATUSES, default: 'new', index: true },
    readAt: { type: Date },
  },
  { timestamps: true }
);

ContactMessageSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model<IContactMessage>('ContactMessage', ContactMessageSchema);
