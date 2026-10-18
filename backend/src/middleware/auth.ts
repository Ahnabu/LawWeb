import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import User from '../models/User';
import { clearAuthCookies } from '../utils/session';

interface AuthRequest extends Request {
  user?: any;
}

// Everything controllers read from req.user, plus what the checks below need
export const AUTH_USER_FIELDS =
  'name email role barId phone specialization profileImageUrl isVerified passwordNeedsChange tokenVersion isBlocked';

export const ACCOUNT_BLOCKED_MESSAGE = 'Your account has been blocked. Contact the firm for help.';

// Error codes the frontend's request queue (frontend/lib/http.ts) reacts to:
// any 401 triggers one refresh + retry; PASSWORD_CHANGE_REQUIRED does not;
// ACCOUNT_BLOCKED signs the user out locally and explains why.
export const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const accessToken = req.cookies.accessToken;

  if (!accessToken) {
    return res.status(401).json({ message: 'Authentication required', code: 'TOKEN_MISSING' });
  }

  let decoded;
  try {
    decoded = verifyAccessToken(accessToken);
  } catch (error) {
    const expired = (error as Error).name === 'TokenExpiredError';
    return res.status(401).json({
      message: expired ? 'Access token expired' : 'Invalid access token',
      code: expired ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID',
    });
  }

  try {
    // Runs on every authenticated request: lean read of just what the routes use
    const user = await User.findById(decoded.userId).select(AUTH_USER_FIELDS).lean();

    // Checked before the version: blocking also bumps tokenVersion, and the
    // user should learn they were blocked rather than see a generic expiry.
    if (user?.isBlocked) {
      clearAuthCookies(res);
      return res.status(403).json({ message: ACCOUNT_BLOCKED_MESSAGE, code: 'ACCOUNT_BLOCKED' });
    }

    // tokenVersion moves on password change/reset, killing every older token.
    // Tokens issued before versioning existed carry no tv and are refused too.
    if (!user || typeof decoded.tv !== 'number' || (user.tokenVersion ?? 0) !== decoded.tv) {
      return res.status(401).json({ message: 'Session is no longer valid', code: 'TOKEN_REVOKED' });
    }

    // Accounts created with a temporary password may only use the auth endpoints
    // (profile, change password, logout) until the password is changed.
    if (user.passwordNeedsChange && req.baseUrl !== '/api/auth') {
      return res.status(403).json({ message: 'You must change your password before continuing.', code: 'PASSWORD_CHANGE_REQUIRED' });
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

export const authorizeRoles = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }

    next();
  };
};
