import { IUser } from '../models/User';
interface TokenPayload {
    userId: string;
    email: string;
    role: string;
}
export declare const generateAccessToken: (user: IUser) => string;
export declare const generateRefreshToken: (user: IUser) => string;
export declare const verifyAccessToken: (token: string) => TokenPayload;
export declare const verifyRefreshToken: (token: string) => TokenPayload;
export {};
//# sourceMappingURL=jwt.d.ts.map