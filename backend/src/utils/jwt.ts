import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

// Anything with an id, role and tokenVersion: a hydrated user or a lean() one
export interface TokenSubject {
  _id: mongoose.Types.ObjectId;
  role: string;
  tokenVersion?: number;
}

interface TokenPayload {
  userId: string;
  role: string;
  // User.tokenVersion at issue time; a mismatch means the token was revoked
  tv: number;
}

interface RefreshTokenPayload extends TokenPayload {
  // Session absolute expiry (seconds since epoch), carried so a rotation can
  // cap the new token without reading the session first
  sae: number;
}

// Short-lived: the frontend refreshes it transparently (see frontend/lib/http.ts)
export const ACCESS_TOKEN_TTL_MS = 15 * 60 * 1000;
// A device idle this long must sign in again
export const REFRESH_IDLE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
// A session never outlives this, however active it is
export const SESSION_ABSOLUTE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const ALGORITHM = 'HS256';
const signOptions = {
  issuer: 'lawweb-backend',
  audience: 'lawweb-client',
};

const basePayload = (user: TokenSubject): TokenPayload => ({
  userId: user._id.toString(),
  role: user.role,
  tv: user.tokenVersion ?? 0,
});

export const generateAccessToken = (user: TokenSubject): string =>
  jwt.sign(basePayload(user), process.env.JWT_SECRET!, {
    ...signOptions,
    algorithm: ALGORITHM,
    expiresIn: Math.floor(ACCESS_TOKEN_TTL_MS / 1000),
  });

export const generateRefreshToken = (user: TokenSubject, jti: string, expiresAt: Date, absoluteExpiresAt: Date): string => {
  const payload: RefreshTokenPayload = {
    ...basePayload(user),
    sae: Math.floor(absoluteExpiresAt.getTime() / 1000),
  };

  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, {
    ...signOptions,
    algorithm: ALGORITHM,
    expiresIn: Math.max(1, Math.floor((expiresAt.getTime() - Date.now()) / 1000)),
    jwtid: jti,
  });
};

export const verifyAccessToken = (token: string): TokenPayload =>
  jwt.verify(token, process.env.JWT_SECRET!, { ...signOptions, algorithms: [ALGORITHM] }) as TokenPayload;

export const verifyRefreshToken = (token: string): RefreshTokenPayload =>
  jwt.verify(token, process.env.JWT_REFRESH_SECRET!, { ...signOptions, algorithms: [ALGORITHM] }) as RefreshTokenPayload;
