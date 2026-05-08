import mongoose, { Document } from 'mongoose';
export interface IUser extends Document {
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
    createdAt: Date;
    updatedAt: Date;
    comparePassword(password: string): Promise<boolean>;
}
declare const _default: mongoose.Model<IUser, {}, {}, {}, mongoose.Document<unknown, {}, IUser, {}, mongoose.DefaultSchemaOptions> & IUser & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IUser>;
export default _default;
//# sourceMappingURL=User.d.ts.map