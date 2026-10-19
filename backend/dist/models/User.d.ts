import mongoose, { Document } from 'mongoose';
export interface IUser extends Document<mongoose.Types.ObjectId> {
    name: string;
    email: string;
    password?: string;
    role: 'admin' | 'lawyer' | 'client';
    barId?: string;
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
    tokenVersion: number;
    isBlocked: boolean;
    blockedAt?: Date;
    blockedReason?: string;
    deletedAt?: Date | null;
    deletedBy?: mongoose.Types.ObjectId | null;
    deletionPending?: boolean;
    sortOrder: number;
    createdAt: Date;
    updatedAt: Date;
    comparePassword(password: string): Promise<boolean>;
}
export declare const PASSWORD_HASH_ROUNDS = 12;
export declare const hashPassword: (password: string) => Promise<string>;
declare const _default: mongoose.Model<IUser, {}, {}, {}, mongoose.Document<unknown, {}, IUser, {}, mongoose.DefaultSchemaOptions> & IUser & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IUser>;
export default _default;
//# sourceMappingURL=User.d.ts.map