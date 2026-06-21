import mongoose, { Schema, Document } from 'mongoose';

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
  },
  { timestamps: true }
);

export default mongoose.model<IConsultation>('Consultation', ConsultationSchema);
