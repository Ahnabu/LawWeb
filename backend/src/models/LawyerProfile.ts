import mongoose, { Schema, Document } from 'mongoose';

export interface IEducation {
  degree: string;
  institution: string;
  year: number;
  description?: IBilingualField;
}

export interface ICertification {
  name: string;
  issuingBody: string;
  year: number;
  description?: IBilingualField;
}

export interface IBilingualField {
  en: string;
  bn: string;
}

export interface ILawyerProfile extends Document {
  userId: mongoose.Types.ObjectId;
  firstName: string;
  lastName: string;
  profileImageUrl?: string;
  designation: IBilingualField;
  bio: IBilingualField;
  contactEmail?: string;
  contactPhone?: string;
  whatsappNumber?: string;
  barNumber?: string;
  yearAdmitted?: number;
  practiceAreas: string[];
  languages: string[];
  education: IEducation[];
  certifications: ICertification[];
  hourlyRate?: number;
  isActive: boolean;
  joinedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const BilingualSchema = new Schema(
  { en: { type: String, default: '' }, bn: { type: String, default: '' } },
  { _id: false }
);

const EducationSchema = new Schema(
  {
    degree: { type: String, required: true },
    institution: { type: String, required: true },
    year: { type: Number, required: true },
    description: { type: BilingualSchema, default: () => ({ en: '', bn: '' }) },
  },
  { _id: false }
);

const CertificationSchema = new Schema(
  {
    name: { type: String, required: true },
    issuingBody: { type: String, required: true },
    year: { type: Number, required: true },
    description: { type: BilingualSchema, default: () => ({ en: '', bn: '' }) },
  },
  { _id: false }
);

const LawyerProfileSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    firstName: { type: String, trim: true, default: '' },
    lastName: { type: String, trim: true, default: '' },
    profileImageUrl: { type: String, trim: true },
    designation: { type: BilingualSchema, default: () => ({ en: '', bn: '' }) },
    bio: { type: BilingualSchema, default: () => ({ en: '', bn: '' }) },
    contactEmail: { type: String, trim: true, lowercase: true },
    contactPhone: { type: String, trim: true },
    whatsappNumber: { type: String, trim: true },
    barNumber: { type: String, trim: true },
    yearAdmitted: { type: Number },
    practiceAreas: [{ type: String }],
    languages: [{ type: String }],
    education: [EducationSchema],
    certifications: [CertificationSchema],
    hourlyRate: { type: Number },
    isActive: { type: Boolean, default: true },
    joinedAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model<ILawyerProfile>('LawyerProfile', LawyerProfileSchema);
