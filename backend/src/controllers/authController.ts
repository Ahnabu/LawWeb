import { Request, Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import User, { IUser, hashPassword, PASSWORD_HASH_ROUNDS } from '../models/User';
import { verifyRefreshToken } from '../utils/jwt';
import {
  clearAuthCookies,
  hashToken,
  issueSession,
  revokeAllSessions,
  revokeSession,
  rotateSession,
} from '../utils/session';
import {
  sendAccountSetupEmail,
  sendPasswordChangedEmail,
  sendPasswordResetEmail,
  sendVerificationCodeEmail,
} from '../utils/email';
import { getFrontendUrl } from '../config/env';
import { AUTH_USER_FIELDS } from '../middleware/auth';

type UserSummary = Pick<IUser, 'name' | 'email' | 'role' | 'barId' | 'phone' | 'profileImageUrl' | 'isVerified' | 'passwordNeedsChange'> & {
  _id: mongoose.Types.ObjectId;
  tokenVersion?: number;
};

interface AuthRequest extends Request {
  user?: UserSummary;
}

type Recipient = { _id: mongoose.Types.ObjectId; name: string; email: string };

const VERIFICATION_CODE_EXPIRY_MINUTES = 10;
const VERIFICATION_MAX_ATTEMPTS = 5;
const PASSWORD_RESET_EXPIRY_MINUTES = 30;
export const ACCOUNT_SETUP_EXPIRY_HOURS = 72;
// Minimum gap between two emails of the same kind to one account
const EMAIL_RESEND_COOLDOWN_MS = 60 * 1000;

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const sha256 = (value: string) => crypto.createHash('sha256').update(value).digest('hex');

const safeEqual = (a: string, b: string) => {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
};

const isDuplicateKeyError = (error: unknown) => (error as { code?: number })?.code === 11000;

// Compared against for unknown emails so a login costs the same bcrypt time
// whether or not the account exists (no timing oracle for registered emails).
const DUMMY_PASSWORD_HASH = bcrypt.hashSync(crypto.randomBytes(16).toString('hex'), PASSWORD_HASH_ROUNDS);

const toUserResponse = (user: UserSummary) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  barId: user.barId,
  phone: user.phone,
  profileImageUrl: user.profileImageUrl,
  isVerified: user.isVerified,
  passwordNeedsChange: user.passwordNeedsChange,
});

// Work that runs after the response is sent. Used where the response time must
// not depend on whether an account exists, and where the caller need not wait.
const inBackground = (label: string, task: () => Promise<unknown>) => {
  setImmediate(() => {
    task().catch((error) => console.error(`${label}:`, error));
  });
};

// Update filter matching accounts whose last email of this kind is older than
// the cooldown. Putting it in the update itself makes the claim atomic: of two
// parallel requests only one modifies the document and sends.
const cooldownElapsed = (field: 'emailVerificationSentAt' | 'passwordResetSentAt') => ({
  $or: [{ [field]: null }, { [field]: { $lte: new Date(Date.now() - EMAIL_RESEND_COOLDOWN_MS) } }],
});

const newVerificationCode = () => {
  const code = crypto.randomInt(100000, 1000000).toString();
  return {
    code,
    fields: {
      emailVerificationCodeHash: sha256(code),
      emailVerificationExpiresAt: new Date(Date.now() + VERIFICATION_CODE_EXPIRY_MINUTES * 60 * 1000),
      emailVerificationSentAt: new Date(),
      emailVerificationAttempts: 0,
    },
  };
};

// Replaces the code and emails it, unless one went out less than a minute ago
const issueVerificationCode = async (user: Recipient) => {
  const { code, fields } = newVerificationCode();
  const claimed = await User.updateOne(
    { _id: user._id, isVerified: false, ...cooldownElapsed('emailVerificationSentAt') },
    { $set: fields }
  );
  if (claimed.modifiedCount !== 1) return false;

  await sendVerificationCodeEmail({ email: user.email, name: user.name, code, expiresMinutes: VERIFICATION_CODE_EXPIRY_MINUTES });
  return true;
};

const resetUrlFor = (token: string) => `${getFrontendUrl()}/reset-password?token=${token}`;

const newResetToken = (ttlMs: number) => {
  const token = crypto.randomBytes(32).toString('hex');
  return {
    token,
    fields: {
      passwordResetTokenHash: hashToken(token),
      passwordResetExpiresAt: new Date(Date.now() + ttlMs),
      passwordResetSentAt: new Date(),
    },
  };
};

// Used by the admin "add lawyer" flow and the temp-password migration: the
// account gets a random password nobody knows, and the lawyer chooses their own
// through this link.
export const sendAccountSetupLink = async (user: Recipient) => {
  const { token, fields } = newResetToken(ACCOUNT_SETUP_EXPIRY_HOURS * 60 * 60 * 1000);
  await User.updateOne({ _id: user._id }, { $set: fields });
  await sendAccountSetupEmail({
    email: user.email,
    name: user.name,
    setupUrl: resetUrlFor(token),
    expiresHours: ACCOUNT_SETUP_EXPIRY_HOURS,
  });
};

const notifyPasswordChanged = (user: Pick<Recipient, 'name' | 'email'>) =>
  // A failed notice must not undo a successful password change
  inBackground('Password changed notice failed', () => sendPasswordChangedEmail({ email: user.email, name: user.name }));

export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password, role, barId, phone } = req.body;
    const normalizedEmail = normalizeEmail(email);
    const selectedRole = role === 'lawyer' ? 'lawyer' : 'client';

    const existingUser = await User.findOne({ email: normalizedEmail }).select('name email isVerified').lean();
    if (existingUser) {
      if (!existingUser.isVerified) {
        inBackground('Verification email failed', () => issueVerificationCode(existingUser));
        return res.status(200).json({
          message: 'This email is waiting for verification. Enter the code we emailed you, or resend it.',
          verificationRequired: true,
          email: existingUser.email,
        });
      }

      return res.status(409).json({ message: 'User already exists' });
    }

    // Account and first code in one write
    const { code, fields } = newVerificationCode();
    let user;
    try {
      user = await User.create({
        name,
        email: normalizedEmail,
        password,
        role: selectedRole,
        barId,
        phone,
        isVerified: false,
        ...fields,
      });
    } catch (error) {
      // Two sign-ups for the same email raced past the lookup above
      if (isDuplicateKeyError(error)) return res.status(409).json({ message: 'User already exists' });
      throw error;
    }

    let emailSent = true;
    try {
      await sendVerificationCodeEmail({ email: user.email, name: user.name, code, expiresMinutes: VERIFICATION_CODE_EXPIRY_MINUTES });
    } catch (error) {
      // The account exists; the user can use "Resend code" on the verify page
      emailSent = false;
      console.error('Verification email failed:', error);
    }

    res.status(201).json({
      message: emailSent
        ? 'Registration successful. Check your email for a verification code.'
        : 'Registration successful, but we could not send the verification email. Use "Resend code" to try again.',
      verificationRequired: true,
      email: user.email,
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: normalizeEmail(email) })
      .select(`+password ${AUTH_USER_FIELDS}`)
      .lean();

    // Check the password before revealing anything about the account (such as
    // whether it is verified), and before sending any email.
    const isPasswordValid = await bcrypt.compare(password, user?.password ?? DUMMY_PASSWORD_HASH);

    if (!user || !isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!user.isVerified) {
      inBackground('Verification email failed', () => issueVerificationCode(user));
      return res.status(403).json({
        message: 'Please verify your email address before logging in.',
        verificationRequired: true,
        email: user.email,
      });
    }

    const accessTokenExpiresAt = await issueSession(req, res, user);

    res.json({
      message: 'Login successful',
      user: toUserResponse(user),
      accessTokenExpiresAt,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Public on purpose: it must work with an expired access token.
export const logout = async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    if (refreshToken) {
      await revokeSession(refreshToken);
    }
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    clearAuthCookies(res);
  }

  res.json({ message: 'Logout successful' });
};

export const getProfile = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Not authenticated' });
  }

  res.json({ user: toUserResponse(req.user) });
};

// Exchanges the refresh cookie for a new access token AND a new refresh token.
// A refresh token presented again after it was rotated means it leaked, so
// every session of that user is revoked.
export const refreshToken = async (req: Request, res: Response) => {
  const token = req.cookies.refreshToken;

  const reject = (message: string) => {
    clearAuthCookies(res);
    return res.status(401).json({ message, code: 'REFRESH_FAILED' });
  };

  if (!token) {
    return res.status(401).json({ message: 'Refresh token required', code: 'REFRESH_FAILED' });
  }

  try {
    let decoded;
    try {
      decoded = verifyRefreshToken(token);
    } catch {
      return reject('Invalid refresh token');
    }

    // Tokens from before session versioning lack these claims
    if (typeof decoded.tv !== 'number' || typeof decoded.sae !== 'number') {
      return reject('Session format is outdated');
    }

    const user = await User.findById(decoded.userId).select(AUTH_USER_FIELDS).lean();

    if (!user || (user.tokenVersion ?? 0) !== decoded.tv) {
      await revokeSession(token);
      return reject('Session is no longer valid');
    }

    const result = await rotateSession(req, res, user, token, decoded.sae);

    if (result.status === 'unknown') {
      return reject('Session not found');
    }

    if (result.status === 'reused') {
      console.warn(`[auth] Refresh token reuse detected for user ${user._id}; revoking all sessions`);
      await revokeAllSessions(user._id);
      return reject('Session revoked');
    }

    res.json({
      message: 'Token refreshed successfully',
      user: toUserResponse(user),
      accessTokenExpiresAt: result.accessTokenExpiresAt,
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const verifyEmail = async (req: Request, res: Response) => {
  try {
    const { email, code } = req.body as { email: string; code: string };
    const normalizedEmail = normalizeEmail(email);

    // Count the attempt before comparing, atomically, so parallel guesses
    // cannot slip past the limit.
    const candidate = await User.findOneAndUpdate(
      {
        email: normalizedEmail,
        isVerified: false,
        emailVerificationExpiresAt: { $gt: new Date() },
        emailVerificationAttempts: { $not: { $gte: VERIFICATION_MAX_ATTEMPTS } },
      },
      { $inc: { emailVerificationAttempts: 1 } },
      { returnDocument: 'after' }
    )
      .select('+emailVerificationCodeHash +emailVerificationAttempts')
      .lean();

    if (!candidate) {
      // Slow path only: explain why nothing matched
      const state = await User.findOne({ email: normalizedEmail })
        .select('isVerified +emailVerificationAttempts')
        .lean();

      if (state?.isVerified) {
        // No user data here: this endpoint is unauthenticated
        return res.status(409).json({ message: 'This email is already verified. Please log in.' });
      }
      if (state && (state.emailVerificationAttempts ?? 0) >= VERIFICATION_MAX_ATTEMPTS) {
        return res.status(429).json({ message: 'Too many incorrect attempts. Please resend a new code.' });
      }
      if (state) {
        return res.status(400).json({ message: 'Verification code expired. Please resend the code.' });
      }
      return res.status(400).json({ message: 'Invalid or expired verification code.' });
    }

    const codeHash = candidate.emailVerificationCodeHash;
    if (!codeHash || !safeEqual(sha256(code.trim()), codeHash)) {
      if ((candidate.emailVerificationAttempts ?? 0) >= VERIFICATION_MAX_ATTEMPTS) {
        await User.updateOne({ _id: candidate._id }, { $unset: { emailVerificationCodeHash: 1, emailVerificationExpiresAt: 1 } });
        return res.status(429).json({ message: 'Too many incorrect attempts. Please resend a new code.' });
      }
      return res.status(400).json({ message: 'Invalid or expired verification code.' });
    }

    // Conditional on the same code so a code replaced meanwhile cannot verify
    const user = await User.findOneAndUpdate(
      { _id: candidate._id, isVerified: false, emailVerificationCodeHash: codeHash },
      {
        $set: { isVerified: true, emailVerificationAttempts: 0 },
        $unset: { emailVerificationCodeHash: 1, emailVerificationExpiresAt: 1 },
      },
      { returnDocument: 'after' }
    )
      .select(AUTH_USER_FIELDS)
      .lean();

    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired verification code.' });
    }

    const accessTokenExpiresAt = await issueSession(req, res, user);

    res.json({
      message: 'Email verified successfully.',
      user: toUserResponse(user),
      accessTokenExpiresAt,
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// The answer is the same, and sent before any lookup, whether or not the
// account exists or the cooldown applies (no enumeration, no timing signal).
export const resendVerificationCode = async (req: Request, res: Response) => {
  const email = normalizeEmail((req.body as { email: string }).email);

  res.json({ message: 'If that account is waiting for verification, a new code has been sent.' });

  inBackground('Resend verification code failed', async () => {
    const user = await User.findOne({ email, isVerified: false }).select('name email').lean();
    if (user) await issueVerificationCode(user);
  });
};

export const forgotPassword = async (req: Request, res: Response) => {
  const email = normalizeEmail((req.body as { email: string }).email);

  res.json({ message: 'If an account exists for that email, a password reset link has been sent.' });

  inBackground('Forgot password failed', async () => {
    const user = await User.findOne({ email }).select('name email').lean();
    if (!user) return;

    const { token, fields } = newResetToken(PASSWORD_RESET_EXPIRY_MINUTES * 60 * 1000);
    const claimed = await User.updateOne({ _id: user._id, ...cooldownElapsed('passwordResetSentAt') }, { $set: fields });
    if (claimed.modifiedCount !== 1) return;

    await sendPasswordResetEmail({
      email: user.email,
      name: user.name,
      resetUrl: resetUrlFor(token),
      expiresMinutes: PASSWORD_RESET_EXPIRY_MINUTES,
    });
  });
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body as { token: string; password: string };
    const tokenFilter = { passwordResetTokenHash: hashToken(token), passwordResetExpiresAt: { $gt: new Date() } };
    const invalidLink = () =>
      res.status(400).json({ message: 'This reset link is invalid or has expired. Request a new one.' });

    // Cheap indexed check first so bogus tokens never cost a bcrypt hash
    if (!(await User.exists(tokenFilter))) {
      return invalidLink();
    }

    const passwordHash = await hashPassword(password);

    // Consuming the token and setting the password is one write: a link used
    // twice in parallel succeeds only once.
    const user = await User.findOneAndUpdate(
      tokenFilter,
      {
        $set: {
          password: passwordHash,
          passwordNeedsChange: false,
          passwordChangedAt: new Date(),
          // The link arrived by email, which proves ownership of the address
          isVerified: true,
        },
        $unset: {
          passwordResetTokenHash: 1,
          passwordResetExpiresAt: 1,
          emailVerificationCodeHash: 1,
          emailVerificationExpiresAt: 1,
        },
        $inc: { tokenVersion: 1 },
      },
      { returnDocument: 'after' }
    )
      .select('name email')
      .lean();

    if (!user) {
      return invalidLink();
    }

    await revokeAllSessions(user._id);
    clearAuthCookies(res);
    notifyPasswordChanged(user);

    res.json({ message: 'Your password has been reset. You can now log in with the new password.' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const changePassword = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const { currentPassword, newPassword } = req.body as { currentPassword: string; newPassword: string };

    if (currentPassword === newPassword) {
      return res.status(400).json({ message: 'New password must be different from the current password.' });
    }

    const current = await User.findById(req.user._id).select('+password').lean();
    if (!current?.password) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!(await bcrypt.compare(currentPassword, current.password))) {
      return res.status(400).json({ message: 'Current password is incorrect.' });
    }

    const passwordHash = await hashPassword(newPassword);

    // Conditional on the hash we verified against, so two parallel changes
    // cannot both succeed, and tokenVersion moves in the same write.
    const user = await User.findOneAndUpdate(
      { _id: current._id, password: current.password },
      {
        $set: { password: passwordHash, passwordNeedsChange: false, passwordChangedAt: new Date() },
        $inc: { tokenVersion: 1 },
      },
      { returnDocument: 'after' }
    )
      .select(AUTH_USER_FIELDS)
      .lean();

    if (!user) {
      return res.status(409).json({ message: 'Your password was changed from another session. Please sign in again.' });
    }

    // Sign out every other device, keep this one signed in with fresh tokens
    await revokeAllSessions(user._id);
    const accessTokenExpiresAt = await issueSession(req, res, user);
    notifyPasswordChanged(user);

    res.json({ message: 'Password changed successfully.', user: toUserResponse(user), accessTokenExpiresAt });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
