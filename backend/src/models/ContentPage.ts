import mongoose, { Schema, Document } from 'mongoose';
import { CONTENT_PAGE_KEYS, ContentPageKey } from '../config/contentSchemas';

export interface IContentPage extends Document {
  key: ContentPageKey;
  draft: Record<string, unknown>;
  published: Record<string, unknown>;
  version: number; // published version; 0 = never published
  hasUnpublishedChanges: boolean;
  draftUpdatedAt?: Date;
  draftUpdatedBy?: mongoose.Types.ObjectId;
  draftUpdatedByName?: string;
  publishedAt?: Date;
  publishedBy?: mongoose.Types.ObjectId;
  publishedByName?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ContentPageSchema: Schema = new Schema(
  {
    key: { type: String, enum: CONTENT_PAGE_KEYS, required: true, unique: true },
    draft: { type: Schema.Types.Mixed, default: {} },
    published: { type: Schema.Types.Mixed, default: {} },
    version: { type: Number, default: 0 },
    hasUnpublishedChanges: { type: Boolean, default: false },
    draftUpdatedAt: { type: Date, default: null },
    draftUpdatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    draftUpdatedByName: { type: String, trim: true },
    publishedAt: { type: Date, default: null },
    publishedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    publishedByName: { type: String, trim: true },
  },
  // minimize: false keeps empty objects ({}) instead of dropping the field
  { timestamps: true, minimize: false }
);

export default mongoose.model<IContentPage>('ContentPage', ContentPageSchema);
