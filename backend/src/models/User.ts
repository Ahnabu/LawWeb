import mongoose, { Schema, Document, CallbackWithoutResultAndOptionalError } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  role: 'admin' | 'lawyer' | 'client';
  barId?: string; // For lawyers
  phone?: string;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(password: string): Promise<boolean>;
}

const UserSchema: Schema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false }, // Hidden by default
    role: { type: String, enum: ['admin', 'lawyer', 'client'], default: 'client' },
    barId: { type: String, sparse: true },
    phone: { type: String },
    isVerified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Hash password before saving
UserSchema.pre('save', async function (this: IUser & Document) {
  // Only run this function if password was modified
  if (!this.isModified('password')) return;

  try {
    // Hash password with cost of 12
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password!, salt);
  } catch (error) {
    throw error;
  }
});

// Compare password method
UserSchema.methods.comparePassword = async function (password: string): Promise<boolean> {
  return bcrypt.compare(password, this.password!);
};

export default mongoose.model<IUser>('User', UserSchema);
