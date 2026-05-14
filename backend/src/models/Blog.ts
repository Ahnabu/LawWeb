import mongoose, { Schema, Document } from 'mongoose';

export type BlogStatus = 'draft' | 'published' | 'archived';

export interface IBlogBlock {
  type: 'h1' | 'h2' | 'h3' | 'paragraph' | 'quote' | 'callout' | 'divider' | 'list';
  content?: string;
  items?: string[];
}

export interface IBlog extends Document {
  title: string;
  slug: string;
  excerpt: string;
  coverImageUrl?: string;
  category: string;
  tags: string[];
  blocks: IBlogBlock[];
  status: BlogStatus;
  authorId: mongoose.Types.ObjectId;
  authorName: string;
  readingTimeMinutes: number;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const BlogBlockSchema = new Schema(
  {
    type: {
      type: String,
      enum: ['h1', 'h2', 'h3', 'paragraph', 'quote', 'callout', 'divider', 'list'],
      required: true,
    },
    content: { type: String, trim: true },
    items: [{ type: String, trim: true }],
  },
  { _id: false }
);

const BlogSchema: Schema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, trim: true, lowercase: true },
    excerpt: { type: String, required: true, trim: true, maxlength: 300 },
    coverImageUrl: { type: String, trim: true },
    category: {
      type: String,
      required: true,
      enum: [
        'immigration', 'criminal-law', 'civil-law', 'corporate-law', 'family-law',
        'real-estate', 'banking-finance', 'labor-law', 'tax-law', 'legal-tips', 'news', 'other',
      ],
    },
    tags: [{ type: String, trim: true, lowercase: true }],
    blocks: { type: [BlogBlockSchema], default: [] },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
    },
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    authorName: { type: String, required: true, trim: true },
    readingTimeMinutes: { type: Number, default: 1 },
    publishedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Auto-generate slug and reading time before saving
BlogSchema.pre('save', function (this: IBlog & Document) {
  // Slug
  if (!this.slug || this.isModified('title')) {
    this.slug =
      this.title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-') +
      '-' +
      Date.now();
  }

  // Reading time: ~200 words per minute
  const wordCount = this.blocks.reduce((acc, block) => {
    const text = block.content ?? (block.items ?? []).join(' ');
    return acc + text.split(/\s+/).filter(Boolean).length;
  }, 0);
  this.readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 200));

  // Set publishedAt when first published
  if (this.status === 'published' && !this.publishedAt) {
    this.publishedAt = new Date();
  }
});

export default mongoose.model<IBlog>('Blog', BlogSchema);
