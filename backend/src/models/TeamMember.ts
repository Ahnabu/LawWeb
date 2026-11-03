import mongoose, { Schema, Document } from 'mongoose';

// A member of the firm's administrative and support staff, shown on the public
// "Our Team" page under the lawyers. This is a *public profile*, separate from
// the staff login accounts (User with role 'staff'): anyone can be listed here
// and no account is created for them.
//
// The role is free text on purpose ("Office Manager", "Senior Associate",
// "Head of Operations"), so the firm can describe the job however it likes.

export interface ITeamMember extends Document {
  name: string;
  // Free text: the job title shown on the card
  role: string;
  photoUrl?: string;
  phone?: string;
  email?: string;
  // Short line under the name (optional)
  bio?: string;
  // Position on the public page (ascending), set by the admin
  sortOrder: number;
  // Hidden from the public page without being deleted
  isVisible: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TeamMemberSchema: Schema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    role: { type: String, required: true, trim: true, maxlength: 120 },
    photoUrl: { type: String, trim: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    email: { type: String, trim: true, lowercase: true, default: '' },
    bio: { type: String, trim: true, maxlength: 500, default: '' },
    sortOrder: { type: Number, default: 0, index: true },
    isVisible: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

export default mongoose.model<ITeamMember>('TeamMember', TeamMemberSchema);
