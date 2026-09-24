import mongoose, { Schema, Document } from 'mongoose';
import { CONTENT_PAGE_KEYS, ContentPageKey } from '../config/contentSchemas';

// Snapshot of a page's data at the moment it was published.
export interface IContentRevision extends Document {
  pageKey: ContentPageKey;
  version: number;
  data: Record<string, unknown>;
  publishedBy?: mongoose.Types.ObjectId;
  publishedByName?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ContentRevisionSchema: Schema = new Schema(
  {
    pageKey: { type: String, enum: CONTENT_PAGE_KEYS, required: true },
    version: { type: Number, required: true },
    data: { type: Schema.Types.Mixed, default: {} },
    publishedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    publishedByName: { type: String, trim: true },
  },
  { timestamps: true, minimize: false }
);

ContentRevisionSchema.index({ pageKey: 1, version: -1 }, { unique: true });

export default mongoose.model<IContentRevision>('ContentRevision', ContentRevisionSchema);
