import mongoose from 'mongoose';
export interface TokenSubject {
    _id: mongoose.Types.ObjectId;
    role: string;
    tokenVersion?: number;
}
interface TokenPayload {
    userId: string;
    role: string;
    tv: number;
}
interface RefreshTokenPayload extends TokenPayload {
    sae: number;
}
export declare const ACCESS_TOKEN_TTL_MS: number;
export declare const REFRESH_IDLE_TTL_MS: number;
export declare const SESSION_ABSOLUTE_TTL_MS: number;
export declare const generateAccessToken: (user: TokenSubject) => string;
export declare const generateRefreshToken: (user: TokenSubject, jti: string, expiresAt: Date, absoluteExpiresAt: Date) => string;
export declare const verifyAccessToken: (token: string) => TokenPayload;
export declare const verifyRefreshToken: (token: string) => RefreshTokenPayload;
export {};
//# sourceMappingURL=jwt.d.ts.map