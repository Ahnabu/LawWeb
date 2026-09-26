import mongoose, { Schema, Document } from 'mongoose';

// One row per signed-in device, rotated in place on every refresh. Only SHA-256
// hashes of refresh tokens are stored, so a database leak hands out no sessions.
export interface ISession extends Document {
  userId: mongoose.Types.ObjectId;
  // Hash of the refresh token this device currently holds
  tokenHash: string;
  // Hash of the token it held before the last rotation. Seeing it again after
  // the grace window means the token was copied, and the user's sessions are revoked.
  previousTokenHash?: string;
  rotatedAt?: Date;
  // Idle expiry: pushed forward on each refresh, never past absoluteExpiresAt
  expiresAt: Date;
  // Hard cap from login time; the user must sign in again after it
  absoluteExpiresAt: Date;
  lastUsedAt: Date;
  userAgent?: string;
  ip?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SessionSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    previousTokenHash: { type: String, index: { sparse: true } },
    rotatedAt: { type: Date },
    expiresAt: { type: Date, required: true },
    absoluteExpiresAt: { type: Date, required: true },
    lastUsedAt: { type: Date, required: true },
    userAgent: { type: String },
    ip: { type: String },
  },
  { timestamps: true }
);

// MongoDB removes idle or expired sessions on its own
SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model<ISession>('Session', SessionSchema);
