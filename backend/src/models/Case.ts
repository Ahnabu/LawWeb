import mongoose, { Schema, Document } from 'mongoose';

export type CaseType =
  | 'immigration'
  | 'criminal'
  | 'civil'
  | 'corporate'
  | 'family'
  | 'real-estate'
  | 'intellectual-property'
  | 'banking-finance'
  | 'labor'
  | 'tax'
  | 'constitutional'
  | 'environmental';

export type CaseStatus =
  | 'active'
  | 'filed'
  | 'hearing-scheduled'
  | 'under-review'
  | 'closed'
  | 'won'
  | 'lost'
  | 'settled'
  | 'appealed';

export type CasePriority = 'high' | 'medium' | 'low';

export interface ICase extends Document {
  caseNumber: string;
  clientId?: mongoose.Types.ObjectId;
  clientEmail: string;
  clientName: string;
  lawyerId: mongoose.Types.ObjectId;
  type: CaseType;
  title: string;
  description: string;
  status: CaseStatus;
  priority: CasePriority;
  isOnline: boolean;
  isFeatured: boolean;
  courtName?: string;
  jurisdiction?: string;
  opposingParty?: string;
  opposingCounsel?: string;
  filingDate?: Date;
  nextCourtDate?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CaseSchema: Schema = new Schema(
  {
    caseNumber: {
      type: String,
      unique: true,
    },
    clientId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    clientEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    clientName: {
      type: String,
      required: true,
      trim: true,
    },
    lawyerId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: [
        'immigration', 'criminal', 'civil', 'corporate', 'family',
        'real-estate', 'intellectual-property', 'banking-finance',
        'labor', 'tax', 'constitutional', 'environmental',
      ],
      required: true,
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    status: {
      type: String,
      enum: ['active', 'filed', 'hearing-scheduled', 'under-review', 'closed', 'won', 'lost', 'settled', 'appealed'],
      default: 'active',
    },
    priority: {
      type: String,
      enum: ['high', 'medium', 'low'],
      default: 'medium',
    },
    isOnline: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
    courtName: { type: String, trim: true },
    jurisdiction: { type: String, trim: true },
    opposingParty: { type: String, trim: true },
    opposingCounsel: { type: String, trim: true },
    filingDate: { type: Date, default: null },
    nextCourtDate: { type: Date, default: null },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

// Auto-generate caseNumber before saving
CaseSchema.pre('save', async function (this: ICase & Document) {
  if (this.caseNumber) return;

  const year = new Date().getFullYear();
  const count = await mongoose.model('Case').countDocuments();
  this.caseNumber = `CAS-${year}-${String(count + 1).padStart(3, '0')}`;
});

export default mongoose.model<ICase>('Case', CaseSchema);
