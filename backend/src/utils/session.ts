import crypto from 'crypto';
import { CookieOptions, Request, Response } from 'express';
import mongoose from 'mongoose';
import Session from '../models/Session';
import {
  ACCESS_TOKEN_TTL_MS,
  REFRESH_IDLE_TTL_MS,
  SESSION_ABSOLUTE_TTL_MS,
  TokenSubject,
  generateAccessToken,
  generateRefreshToken,
} from './jwt';

// The refresh cookie is only sent to /api/auth/* (refresh, logout), never on
// ordinary API calls, which keeps the long-lived credential off most requests.
const REFRESH_COOKIE_PATH = '/api/auth';

// Two tabs may refresh with the same token at the same moment. Within this
// window the loser gets a fresh access token instead of tripping reuse detection.
const ROTATION_GRACE_MS = 60 * 1000;

export const hashToken = (token: string) => crypto.createHash('sha256').update(token).digest('hex');

const baseCookieOptions = (): CookieOptions => {
  const sameSite = (process.env.COOKIE_SAMESITE || 'none').toLowerCase() as CookieOptions['sameSite'];
  const options: CookieOptions = {
    httpOnly: true,
    // Chrome/Firefox treat http://localhost as secure, so this works in development too
    secure: true,
    sameSite,
  };
  if (process.env.NODE_ENV === 'production' && process.env.COOKIE_DOMAIN) {
    options.domain = process.env.COOKIE_DOMAIN;
  }
  return options;
};

// Returns the expiry (ms since epoch) so the client can refresh before it lapses
export const setAccessCookie = (res: Response, user: TokenSubject) => {
  res.cookie('accessToken', generateAccessToken(user), {
    ...baseCookieOptions(),
    path: '/',
    maxAge: ACCESS_TOKEN_TTL_MS,
  });
  return Date.now() + ACCESS_TOKEN_TTL_MS;
};

const setRefreshCookie = (res: Response, token: string, expiresAt: Date) => {
  res.cookie('refreshToken', token, {
    ...baseCookieOptions(),
    path: REFRESH_COOKIE_PATH,
    maxAge: Math.max(0, expiresAt.getTime() - Date.now()),
  });
};

export const clearAuthCookies = (res: Response) => {
  const options = baseCookieOptions();
  res.clearCookie('accessToken', { ...options, path: '/' });
  res.clearCookie('refreshToken', { ...options, path: REFRESH_COOKIE_PATH });
  // Refresh cookies issued before the path was narrowed lived on "/"
  res.clearCookie('refreshToken', { ...options, path: '/' });
};

const clientInfo = (req: Request) => ({
  userAgent: req.get('user-agent')?.slice(0, 300),
  ip: req.ip,
});

// Starts a new device session (login, email verification, password change).
// Returns the access-token expiry for the response body.
export const issueSession = async (req: Request, res: Response, user: TokenSubject) => {
  const now = Date.now();
  const absoluteExpiresAt = new Date(now + SESSION_ABSOLUTE_TTL_MS);
  const expiresAt = new Date(now + REFRESH_IDLE_TTL_MS);
  const refreshToken = generateRefreshToken(user, crypto.randomUUID(), expiresAt, absoluteExpiresAt);

  await Session.create({
    userId: user._id,
    tokenHash: hashToken(refreshToken),
    expiresAt,
    absoluteExpiresAt,
    lastUsedAt: new Date(now),
    ...clientInfo(req),
  });

  setRefreshCookie(res, refreshToken, expiresAt);
  return setAccessCookie(res, user);
};

export type RotateResult =
  | { status: 'rotated'; accessTokenExpiresAt: number }
  | { status: 'grace'; accessTokenExpiresAt: number }
  | { status: 'reused' }
  | { status: 'unknown' };

// Swaps the device's refresh token for a new one in a single atomic write.
// `absoluteExpiresAtSec` comes from the verified refresh token (claim "sae").
export const rotateSession = async (
  req: Request,
  res: Response,
  user: TokenSubject,
  presentedToken: string,
  absoluteExpiresAtSec: number
): Promise<RotateResult> => {
  const presentedHash = hashToken(presentedToken);
  const now = new Date();
  const absoluteExpiresAt = new Date(absoluteExpiresAtSec * 1000);
  const expiresAt = new Date(Math.min(now.getTime() + REFRESH_IDLE_TTL_MS, absoluteExpiresAt.getTime()));

  if (expiresAt.getTime() <= now.getTime()) {
    return { status: 'unknown' };
  }

  const nextToken = generateRefreshToken(user, crypto.randomUUID(), expiresAt, absoluteExpiresAt);

  // Matching on the current hash makes exactly one concurrent caller win
  const rotated = await Session.updateOne(
    { tokenHash: presentedHash, userId: user._id, absoluteExpiresAt: { $gt: now } },
    {
      $set: {
        tokenHash: hashToken(nextToken),
        previousTokenHash: presentedHash,
        rotatedAt: now,
        expiresAt,
        lastUsedAt: now,
        ...clientInfo(req),
      },
    }
  );

  if (rotated.modifiedCount === 1) {
    setRefreshCookie(res, nextToken, expiresAt);
    return { status: 'rotated', accessTokenExpiresAt: setAccessCookie(res, user) };
  }

  const previous = await Session.findOne({ previousTokenHash: presentedHash, userId: user._id })
    .select('rotatedAt')
    .lean();

  if (!previous) {
    return { status: 'unknown' };
  }

  if (previous.rotatedAt && now.getTime() - previous.rotatedAt.getTime() <= ROTATION_GRACE_MS) {
    // Another tab rotated a moment ago and already got the new refresh cookie
    return { status: 'grace', accessTokenExpiresAt: setAccessCookie(res, user) };
  }

  return { status: 'reused' };
};

// Logout of one device. The cookie normally holds the current token; the
// previous one is matched too in case a racing refresh just rotated it.
export const revokeSession = (refreshToken: string) => {
  const tokenHash = hashToken(refreshToken);
  return Session.deleteOne({ $or: [{ tokenHash }, { previousTokenHash: tokenHash }] });
};

export const revokeAllSessions = (userId: mongoose.Types.ObjectId | string) => Session.deleteMany({ userId });
