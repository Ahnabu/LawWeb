import { Request, Response } from "express";
import mongoose from "mongoose";
import { IUser } from "../models/User";
type UserSummary = Pick<IUser, "name" | "email" | "role" | "barId" | "phone" | "profileImageUrl" | "isVerified" | "passwordNeedsChange"> & {
    _id: mongoose.Types.ObjectId;
    tokenVersion?: number;
};
interface AuthRequest extends Request {
    user?: UserSummary;
}
type Recipient = {
    _id: mongoose.Types.ObjectId;
    name: string;
    email: string;
};
export declare const ACCOUNT_SETUP_EXPIRY_HOURS = 72;
export declare const sendAccountSetupLink: (user: Recipient) => Promise<void>;
export declare const register: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const login: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const logout: (req: Request, res: Response) => Promise<void>;
export declare const getProfile: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const refreshToken: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const verifyEmail: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const resendVerificationCode: (req: Request, res: Response) => Promise<void>;
export declare const forgotPassword: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare const resetPassword: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const changePassword: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export {};
//# sourceMappingURL=authController.d.ts.map