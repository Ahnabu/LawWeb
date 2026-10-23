import mongoose, { Schema, Document } from 'mongoose';

// A photo on the public Gallery page. The image itself lives on Cloudinary
// (folder lawweb/gallery); title and description are bilingual, and an empty
// Bangla value falls back to English on the public site.

export const GALLERY_TITLE_MAX = 120;
export const GALLERY_DESCRIPTION_MAX = 5000;
// The admin page and the public page load the whole list, so it stays bounded
export const GALLERY_MAX_IMAGES = 300;

export interface IGalleryText {
  en: string;
  bn: string;
}

export interface IGalleryImage extends Document {
  imageUrl: string;
  // Cloudinary public_id, used to delete the file with the record
  imagePublicId?: string;
  title: IGalleryText;
  description: IGalleryText;
  // Ascending; the public page shows images in this order
  sortOrder: number;
  isPublished: boolean;
  createdBy?: mongoose.Types.ObjectId | null;
  updatedBy?: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const textSchema = (max: number) =>
  new Schema(
    {
      en: { type: String, trim: true, default: '', maxlength: max },
      bn: { type: String, trim: true, default: '', maxlength: max },
    },
    { _id: false }
  );

const GalleryImageSchema = new Schema(
  {
    imageUrl: { type: String, required: true, trim: true },
    imagePublicId: { type: String, trim: true },
    title: { type: textSchema(GALLERY_TITLE_MAX), default: () => ({ en: '', bn: '' }) },
    description: { type: textSchema(GALLERY_DESCRIPTION_MAX), default: () => ({ en: '', bn: '' }) },
    sortOrder: { type: Number, default: 0 },
    isPublished: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

// Public list: published images in order
GalleryImageSchema.index({ isPublished: 1, sortOrder: 1 });

export default mongoose.model<IGalleryImage>('GalleryImage', GalleryImageSchema);
