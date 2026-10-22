import mongoose, { Schema, Document } from 'mongoose';

// A firm role built by the super-admin: a name plus permission keys from
// access/permissions.ts. Keys are stored as chosen (not expanded); loadAccess
// expands implied keys and drops stale ones on every request.
export interface IRole extends Document<mongoose.Types.ObjectId> {
  name: string;
  // name.toLowerCase(), so "Receptionist" and "receptionist" can't both exist
  nameKey: string;
  description?: string;
  permissions: string[];
  createdBy?: mongoose.Types.ObjectId | null;
  updatedBy?: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const RoleSchema: Schema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    nameKey: { type: String, required: true, unique: true },
    description: { type: String, trim: true, maxlength: 300 },
    permissions: [{ type: String }],
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

export const roleNameKey = (name: string) => name.trim().toLowerCase();

export default mongoose.model<IRole>('Role', RoleSchema);
