import mongoose, { Schema, Document, CallbackWithoutResultAndOptionalError } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document<mongoose.Types.ObjectId> {
  name: string;
  email: string;
  password?: string;
  role: 'admin' | 'lawyer' | 'client';
  barId?: string; // For lawyers
  phone?: string;
  specialization?: string;
  isVerified: boolean;
  passwordNeedsChange: boolean;
  profileImageUrl?: string;
  emailVerificationCodeHash?: string;
  emailVerificationExpiresAt?: Date;
  emailVerificationSentAt?: Date;
  emailVerificationAttempts?: number;
  passwordResetTokenHash?: string;
  passwordResetExpiresAt?: Date;
  passwordResetSentAt?: Date;
  passwordChangedAt?: Date;
  // Bumped whenever every existing session must die (password change/reset)
  tokenVersion: number;
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
    specialization: { type: String },
    isVerified: { type: Boolean, default: false },
    passwordNeedsChange: { type: Boolean, default: false },
    profileImageUrl: { type: String, trim: true },
    emailVerificationCodeHash: { type: String, select: false },
    emailVerificationExpiresAt: { type: Date, select: false },
    emailVerificationSentAt: { type: Date },
    emailVerificationAttempts: { type: Number, default: 0, select: false },
    passwordResetTokenHash: { type: String, select: false, index: true, sparse: true },
    passwordResetExpiresAt: { type: Date, select: false },
    passwordResetSentAt: { type: Date, select: false },
    passwordChangedAt: { type: Date },
    tokenVersion: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export const PASSWORD_HASH_ROUNDS = 12;

// For atomic updateOne() writes, which skip the save hook below
export const hashPassword = (password: string) => bcrypt.hash(password, PASSWORD_HASH_ROUNDS);

// Hash password before saving
UserSchema.pre('save', async function (this: IUser & Document) {
  // Only run this function if password was modified
  if (!this.isModified('password')) return;
  this.password = await hashPassword(this.password!);
});

// Compare password method
UserSchema.methods.comparePassword = async function (password: string): Promise<boolean> {
  return bcrypt.compare(password, this.password!);
};

export default mongoose.model<IUser>('User', UserSchema);
