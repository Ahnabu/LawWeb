import mongoose, { Schema, Document } from 'mongoose';
import { ACTIVE_STATUSES, toDateKey } from '../utils/schedule';

export interface IConsultation extends Document {
  clientId: mongoose.Types.ObjectId;
  lawyerId: mongoose.Types.ObjectId;
  consultationType: 'initial-consultation' | 'follow-up' | 'document-review' | 'case-discussion';
  meetingMode: 'in-person' | 'phone' | 'video';
  date: Date;
  time: string;
  subject: string;
  description: string;
  clientPhone?: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
  lawyerConfirmed: boolean;
  // Tracks that documents were shared via WhatsApp outside the platform
  whatsappDocSharing: boolean;
  whatsappDocNote?: string;
  notes?: string;
  // Set only while the booking holds its slot (scheduled/rescheduled); backs a unique index
  slotKey?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ConsultationSchema: Schema = new Schema(
  {
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    lawyerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    consultationType: {
      type: String,
      enum: ['initial-consultation', 'follow-up', 'document-review', 'case-discussion'],
      required: true,
    },
    meetingMode: {
      type: String,
      enum: ['in-person', 'phone', 'video'],
      default: 'in-person',
    },
    date: {
      type: Date,
      required: true,
    },
    time: {
      type: String,
      required: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    clientPhone: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['scheduled', 'completed', 'cancelled', 'rescheduled'],
      default: 'scheduled',
    },
    lawyerConfirmed: {
      type: Boolean,
      default: false,
    },
    whatsappDocSharing: {
      type: Boolean,
      default: false,
    },
    whatsappDocNote: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
    slotKey: {
      type: String,
      select: false,
    },
  },
  { timestamps: true }
);

// One active booking per lawyer per slot, enforced by the database so two
// concurrent requests cannot both pass the application-level conflict check.
ConsultationSchema.index({ slotKey: 1 }, { unique: true, sparse: true });
ConsultationSchema.index({ lawyerId: 1, date: 1 });

ConsultationSchema.pre('validate', function () {
  const doc = this as unknown as IConsultation;
  if (ACTIVE_STATUSES.includes(doc.status as (typeof ACTIVE_STATUSES)[number]) && doc.date) {
    doc.slotKey = `${doc.lawyerId}|${toDateKey(doc.date)}|${doc.time}`;
  } else {
    doc.slotKey = undefined;
  }
});

export default mongoose.model<IConsultation>('Consultation', ConsultationSchema);
