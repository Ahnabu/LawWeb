import mongoose, { Schema, Document } from 'mongoose';

export type CareerStatus = 'draft' | 'published' | 'closed';
export type EmploymentType = 'full-time' | 'part-time' | 'contract' | 'internship';
export type WorkplaceType = 'on-site' | 'hybrid' | 'remote';

export interface ICareer extends Document {
  title: string;
  slug: string;
  department: string;
  employmentType: EmploymentType;
  workplaceType: WorkplaceType;
  location: string;
  experience?: string;
  salary?: string;
  deadline?: Date | null;
  status: CareerStatus;
  // Both are rich text (HTML from the dashboard editor)
  description: string;
  requirements: string;
  // How to apply: where the CV goes (an email address or a form link)
  applicationEmail?: string;
  applicationUrl?: string;
  // The steps shown under "How to apply" (rich text)
  applicationInstructions?: string;
  authorId: mongoose.Types.ObjectId;
  authorName: string;
  publishedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const CareerSchema: Schema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    slug: { type: String, unique: true, trim: true, lowercase: true },
    department: { type: String, required: true, trim: true, default: 'General' },
    employmentType: {
      type: String,
      enum: ['full-time', 'part-time', 'contract', 'internship'],
      default: 'full-time',
    },
    workplaceType: {
      type: String,
      enum: ['on-site', 'hybrid', 'remote'],
      default: 'on-site',
    },
    location: { type: String, trim: true, default: 'Dhaka, Bangladesh' },
    experience: { type: String, trim: true, default: 'Open to all experience levels' },
    salary: { type: String, trim: true, default: 'Negotiable' },
    deadline: { type: Date, default: null },
    status: {
      type: String,
      enum: ['draft', 'published', 'closed'],
      default: 'draft',
      index: true,
    },
    description: { type: String, required: true, trim: true },
    requirements: { type: String, required: true, trim: true },
    applicationEmail: { type: String, trim: true, default: '' },
    applicationUrl: { type: String, trim: true, default: '' },
    applicationInstructions: { type: String, trim: true, default: '' },
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    authorName: { type: String, required: true, trim: true },
    publishedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Auto-generate slug before saving
CareerSchema.pre('save', function (this: ICareer & Document) {
  if (!this.slug || this.isModified('title')) {
    const baseSlug = this.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
    this.slug = `${baseSlug || 'career'}-${Date.now().toString(36)}`;
  }

  if (this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
});

export default mongoose.model<ICareer>('Career', CareerSchema);

