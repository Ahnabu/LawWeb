import { Request, Response } from 'express';
import User, { IUser } from '../models/User';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt';
import crypto from 'crypto';
import { sendVerificationCodeEmail } from '../utils/email';

interface AuthRequest extends Request {
  user?: IUser;
}

const VERIFICATION_CODE_EXPIRY_MINUTES = 10;

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const generateVerificationCode = () => crypto.randomInt(100000, 1000000).toString();

const hashVerificationCode = (code: string) => crypto.createHash('sha256').update(code).digest('hex');

const buildVerificationPayload = async (user: IUser) => {
  const code = generateVerificationCode();
  const codeHash = hashVerificationCode(code);
  const expiresAt = new Date(Date.now() + VERIFICATION_CODE_EXPIRY_MINUTES * 60 * 1000);

  user.emailVerificationCodeHash = codeHash;
  user.emailVerificationExpiresAt = expiresAt;
  user.emailVerificationSentAt = new Date();
  await user.save();

  await sendVerificationCodeEmail({
    email: user.email,
    name: user.name,
    code,
  });

  return code;
};

export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password, role, barId, phone } = req.body;
    const normalizedEmail = normalizeEmail(email);
    const selectedRole = role === 'lawyer' ? 'lawyer' : 'client';

    // Check if user already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      if (!existingUser.isVerified) {
        await buildVerificationPayload(existingUser);

        return res.status(200).json({
          message: 'A verification code has been resent to your email address.',
          verificationRequired: true,
          email: existingUser.email,
        });
      }

      return res.status(409).json({ message: 'User already exists' });
    }

    // Create new user
    const user = new User({
      name,
      email: normalizedEmail,
      password,
      role: selectedRole,
      barId,
      phone,
      isVerified: false,
    });

    await user.save();

    await buildVerificationPayload(user);

    res.status(201).json({
      message: 'Registration successful. Check your email for a verification code.',
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
    const normalizedEmail = normalizeEmail(email);

    // Find user and include password for comparison
    const user = await User.findOne({ email: normalizedEmail }).select('+password');
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (!user.isVerified) {
      await buildVerificationPayload(user);
      return res.status(403).json({ 
        message: 'Please verify your email address before logging in.',
        verificationRequired: true,
        email: user.email
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Set secure cookies
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 3 * 24 * 60 * 60 * 1000, // 3 days
      domain: process.env.COOKIE_DOMAIN,
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      domain: process.env.COOKIE_DOMAIN,
    });

    // Return user data
    const userResponse = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      barId: user.barId,
      phone: user.phone,
      isVerified: user.isVerified,
      passwordNeedsChange: user.passwordNeedsChange,
    };

    res.json({
      message: 'Login successful',
      user: userResponse,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const logout = async (req: AuthRequest, res: Response) => {
  try {
    // Clear cookies
    res.clearCookie('accessToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      domain: process.env.COOKIE_DOMAIN,
    });

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      domain: process.env.COOKIE_DOMAIN,
    });

    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    res.json({ user: req.user });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const refreshToken = async (req: Request, res: Response) => {
  try {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({ message: 'Refresh token required' });
    }

    // Verify refresh token and generate new access token
    const decoded = require('../utils/jwt').verifyRefreshToken(refreshToken);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    const newAccessToken = generateAccessToken(user);

    // Set new access token cookie
    res.cookie('accessToken', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 3 * 24 * 60 * 60 * 1000, // 3 days
      domain: process.env.COOKIE_DOMAIN,
    });

    res.json({ message: 'Token refreshed successfully' });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(401).json({ message: 'Invalid refresh token' });
  }
};

export const verifyEmail = async (req: Request, res: Response) => {
  try {
    const { email, code } = req.body as { email?: string; code?: string };

    if (!email || !code) {
      return res.status(400).json({ message: 'Email and verification code are required.' });
    }

    const user = await User.findOne({ email: normalizeEmail(email) }).select('+emailVerificationCodeHash +emailVerificationExpiresAt +password');

    if (!user) {
      return res.status(404).json({ message: 'No account found for that email address.' });
    }

    if (user.isVerified) {
      return res.status(200).json({
        message: 'Email is already verified.',
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          barId: user.barId,
          phone: user.phone,
          isVerified: user.isVerified,
        },
      });
    }

    if (!user.emailVerificationCodeHash || !user.emailVerificationExpiresAt) {
      return res.status(400).json({ message: 'Verification code expired. Please resend the code.' });
    }

    if (user.emailVerificationExpiresAt.getTime() < Date.now()) {
      return res.status(400).json({ message: 'Verification code expired. Please resend the code.' });
    }

    if (hashVerificationCode(code.trim()) !== user.emailVerificationCodeHash) {
      return res.status(400).json({ message: 'Invalid verification code.' });
    }

    user.isVerified = true;
    user.emailVerificationCodeHash = undefined;
    user.emailVerificationExpiresAt = undefined;
    await user.save();

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000,
      domain: process.env.COOKIE_DOMAIN,
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      domain: process.env.COOKIE_DOMAIN,
    });

    res.json({
      message: 'Email verified successfully.',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        barId: user.barId,
        phone: user.phone,
        isVerified: user.isVerified,
        passwordNeedsChange: user.passwordNeedsChange,
      },
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const changePassword = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const { currentPassword, newPassword } = req.body as { currentPassword?: string; newPassword?: string };

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required.' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'New password must be at least 8 characters.' });
    }

    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isValid = await user.comparePassword(currentPassword);
    if (!isValid) {
      return res.status(400).json({ message: 'Current password is incorrect.' });
    }

    user.password = newPassword;
    user.passwordNeedsChange = false;
    await user.save();

    res.json({ message: 'Password changed successfully.' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const resendVerificationCode = async (req: Request, res: Response) => {
  try {
    const { email } = req.body as { email?: string };

    console.info('[auth] resendVerificationCode called', { path: req.path, ip: req.ip, email });

    if (!email) {
      return res.status(400).json({ message: 'Email is required.' });
    }

    const user = await User.findOne({ email: normalizeEmail(email) });

    if (!user) {
      return res.status(404).json({ message: 'No account found for that email address.' });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: 'This email is already verified.' });
    }

    await buildVerificationPayload(user);

    res.json({
      message: 'Verification code resent successfully.',
    });
  } catch (error) {
    console.error('Resend verification code error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
