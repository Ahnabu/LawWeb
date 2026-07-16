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

export type CaseStage =
  | 'intake'
  | 'pre-filing'
  | 'filed'
  | 'pre-trial'
  | 'trial'
  | 'post-trial'
  | 'appeal'
  | 'enforcement'
  | 'closed';

export type CaseOrigin = 'walk-in' | 'referral' | 'online' | 'existing-client' | 'court-appointed';

export interface IHearing {
  date: Date;
  description: string;
  outcome?: string;
  nextSteps?: string;
}

export interface ICaseDocument {
  name: string;
  documentType: string;
  sharedVia: 'whatsapp' | 'email' | 'portal' | 'physical';
  date: Date;
  notes?: string;
}

export interface IPayment {
  _id?: mongoose.Types.ObjectId;
  amount: number;
  date: Date;
  details?: string;
}

export interface ICase extends Document {
  caseNumber: string;
  totalPayment?: number;
  payments: IPayment[];
  clientId?: mongoose.Types.ObjectId;
  clientEmail: string;
  clientName: string;
  clientPhone?: string;
  clientWhatsapp?: string;
  lawyerId: mongoose.Types.ObjectId;
  type: CaseType;
  title: string;
  description: string;
  status: CaseStatus;
  stage: CaseStage;
  priority: CasePriority;
  isOnline: boolean;
  isFeatured: boolean;
  courtName?: string;
  jurisdiction?: string;
  opposingParty?: string;
  opposingCounsel?: string;
  filingDate?: Date;
  nextCourtDate?: Date;
  hearingHistory: IHearing[];
  documents: ICaseDocument[];
  statute?: string;
  caseValue?: number;
  retainerAmount?: number;
  estimatedFee?: number;
  retainerPaid: boolean;
  referredBy?: string;
  caseOrigin?: CaseOrigin;
  witnessNames: string[];
  evidenceSummary?: string;
  internalNotes?: string;
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
    clientPhone: { type: String, trim: true },
    clientWhatsapp: { type: String, trim: true },
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
    stage: {
      type: String,
      enum: ['intake', 'pre-filing', 'filed', 'pre-trial', 'trial', 'post-trial', 'appeal', 'enforcement', 'closed'],
      default: 'intake',
    },
    isOnline: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
    courtName: { type: String, trim: true },
    jurisdiction: { type: String, trim: true },
    opposingParty: { type: String, trim: true },
    opposingCounsel: { type: String, trim: true },
    filingDate: { type: Date, default: null },
    nextCourtDate: { type: Date, default: null },
    hearingHistory: [
      {
        date: { type: Date, required: true },
        description: { type: String, required: true, trim: true },
        outcome: { type: String, trim: true },
        nextSteps: { type: String, trim: true },
      },
    ],
    documents: [
      {
        name: { type: String, required: true, trim: true },
        documentType: { type: String, trim: true },
        sharedVia: { type: String, enum: ['whatsapp', 'email', 'portal', 'physical'], default: 'whatsapp' },
        date: { type: Date, default: Date.now },
        notes: { type: String, trim: true },
      },
    ],
    statute: { type: String, trim: true },
    caseValue: { type: Number, default: null },
    retainerAmount: { type: Number, default: null },
    estimatedFee: { type: Number, default: null },
    retainerPaid: { type: Boolean, default: false },
    totalPayment: { type: Number, default: 0 },
    payments: [
      {
        amount: { type: Number, required: true },
        date: { type: Date, default: Date.now, required: true },
        details: { type: String, trim: true }
      }
    ],
    referredBy: { type: String, trim: true },
    caseOrigin: {
      type: String,
      enum: ['walk-in', 'referral', 'online', 'existing-client', 'court-appointed'],
      default: null,
    },
    witnessNames: [{ type: String, trim: true }],
    evidenceSummary: { type: String, trim: true },
    internalNotes: { type: String, trim: true },
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
