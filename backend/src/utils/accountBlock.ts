import mongoose from 'mongoose';
import User from '../models/User';
import { revokeAllSessions } from './session';

// Shared by the Users and Team pages. Callers decide who may be blocked.

type BlockFields = { _id: unknown; isBlocked?: boolean; blockedAt?: Date; blockedReason?: string };

export const MAX_BLOCK_REASON_LENGTH = 500;

export const blockState = (user: BlockFields) => ({
  _id: user._id,
  isBlocked: Boolean(user.isBlocked),
  blockedAt: user.blockedAt ?? null,
  blockedReason: user.blockedReason ?? null,
});

export const blockReasonFrom = (body: unknown) => {
  const raw = (body as { reason?: unknown } | undefined)?.reason;
  return typeof raw === 'string' ? raw.trim().slice(0, MAX_BLOCK_REASON_LENGTH) : '';
};

// tokenVersion moves so every access token already issued stops working at once,
// and every refresh session is revoked. null when the user no longer exists.
export const blockAccount = async (userId: string | mongoose.Types.ObjectId, reason: string) => {
  const updated = await User.findByIdAndUpdate(
    userId,
    reason
      ? { $set: { isBlocked: true, blockedAt: new Date(), blockedReason: reason }, $inc: { tokenVersion: 1 } }
      : { $set: { isBlocked: true, blockedAt: new Date() }, $unset: { blockedReason: 1 }, $inc: { tokenVersion: 1 } },
    { returnDocument: 'after' }
  )
    .select('isBlocked blockedAt blockedReason')
    .lean();
  if (updated) await revokeAllSessions(userId);
  return updated;
};

export const unblockAccount = (userId: string | mongoose.Types.ObjectId) =>
  User.findByIdAndUpdate(
    userId,
    { $set: { isBlocked: false }, $unset: { blockedAt: 1, blockedReason: 1 } },
    { returnDocument: 'after' }
  )
    .select('isBlocked blockedAt blockedReason')
    .lean();
