import mongoose, { Schema, Document } from 'mongoose';

export interface IConsultation extends Document {
  clientId: mongoose.Types.ObjectId;
  lawyerId: mongoose.Types.ObjectId;
  consultationType: 'initial-consultation' | 'follow-up' | 'document-review' | 'case-discussion';
  date: Date;
  time: string;
  subject: string;
  description: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
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
    status: {
      type: String,
      enum: ['scheduled', 'completed', 'cancelled', 'rescheduled'],
      default: 'scheduled',
    },
    notes: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model<IConsultation>('Consultation', ConsultationSchema);
