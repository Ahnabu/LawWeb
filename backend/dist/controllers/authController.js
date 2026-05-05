"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resendVerificationCode = exports.verifyEmail = exports.refreshToken = exports.getProfile = exports.logout = exports.login = exports.register = void 0;
const User_1 = __importDefault(require("../models/User"));
const jwt_1 = require("../utils/jwt");
const crypto_1 = __importDefault(require("crypto"));
const email_1 = require("../utils/email");
const VERIFICATION_CODE_EXPIRY_MINUTES = 10;
const normalizeEmail = (email) => email.trim().toLowerCase();
const generateVerificationCode = () => crypto_1.default.randomInt(100000, 1000000).toString();
const hashVerificationCode = (code) => crypto_1.default.createHash('sha256').update(code).digest('hex');
const buildVerificationPayload = async (user) => {
    const code = generateVerificationCode();
    const codeHash = hashVerificationCode(code);
    const expiresAt = new Date(Date.now() + VERIFICATION_CODE_EXPIRY_MINUTES * 60 * 1000);
    user.emailVerificationCodeHash = codeHash;
    user.emailVerificationExpiresAt = expiresAt;
    user.emailVerificationSentAt = new Date();
    await user.save();
    await (0, email_1.sendVerificationCodeEmail)({
        email: user.email,
        name: user.name,
        code,
    });
    return code;
};
const register = async (req, res) => {
    try {
        const { name, email, password, role, barId, phone } = req.body;
        const normalizedEmail = normalizeEmail(email);
        const selectedRole = role === 'lawyer' ? 'lawyer' : 'client';
        // Check if user already exists
        const existingUser = await User_1.default.findOne({ email: normalizedEmail });
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
        const user = new User_1.default({
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
    }
    catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.register = register;
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const normalizedEmail = normalizeEmail(email);
        // Find user and include password for comparison
        const user = await User_1.default.findOne({ email: normalizedEmail }).select('+password');
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        if (!user.isVerified) {
            return res.status(403).json({ message: 'Please verify your email address before logging in.' });
        }
        // Check password
        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        // Generate tokens
        const accessToken = (0, jwt_1.generateAccessToken)(user);
        const refreshToken = (0, jwt_1.generateRefreshToken)(user);
        // Set secure cookies
        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 15 * 60 * 1000, // 15 minutes
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
        };
        res.json({
            message: 'Login successful',
            user: userResponse,
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.login = login;
const logout = async (req, res) => {
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
    }
    catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.logout = logout;
const getProfile = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: 'Not authenticated' });
        }
        res.json({ user: req.user });
    }
    catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.getProfile = getProfile;
const refreshToken = async (req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken;
        if (!refreshToken) {
            return res.status(401).json({ message: 'Refresh token required' });
        }
        // Verify refresh token and generate new access token
        const decoded = require('../utils/jwt').verifyRefreshToken(refreshToken);
        const user = await User_1.default.findById(decoded.userId);
        if (!user) {
            return res.status(401).json({ message: 'User not found' });
        }
        const newAccessToken = (0, jwt_1.generateAccessToken)(user);
        // Set new access token cookie
        res.cookie('accessToken', newAccessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 15 * 60 * 1000, // 15 minutes
            domain: process.env.COOKIE_DOMAIN,
        });
        res.json({ message: 'Token refreshed successfully' });
    }
    catch (error) {
        console.error('Refresh token error:', error);
        res.status(401).json({ message: 'Invalid refresh token' });
    }
};
exports.refreshToken = refreshToken;
const verifyEmail = async (req, res) => {
    try {
        const { email, code } = req.body;
        if (!email || !code) {
            return res.status(400).json({ message: 'Email and verification code are required.' });
        }
        const user = await User_1.default.findOne({ email: normalizeEmail(email) }).select('+emailVerificationCodeHash +emailVerificationExpiresAt +password');
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
        const accessToken = (0, jwt_1.generateAccessToken)(user);
        const refreshToken = (0, jwt_1.generateRefreshToken)(user);
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
            },
        });
    }
    catch (error) {
        console.error('Email verification error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.verifyEmail = verifyEmail;
const resendVerificationCode = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ message: 'Email is required.' });
        }
        const user = await User_1.default.findOne({ email: normalizeEmail(email) });
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
    }
    catch (error) {
        console.error('Resend verification code error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
exports.resendVerificationCode = resendVerificationCode;
//# sourceMappingURL=authController.js.map