"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.changePassword = exports.resetPassword = exports.forgotPassword = exports.resendVerificationCode = exports.verifyEmail = exports.refreshToken = exports.getProfile = exports.logout = exports.login = exports.register = exports.sendAccountSetupLink = exports.ACCOUNT_SETUP_EXPIRY_HOURS = void 0;
const crypto_1 = __importDefault(require("crypto"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const User_1 = __importStar(require("../models/User"));
const jwt_1 = require("../utils/jwt");
const session_1 = require("../utils/session");
const email_1 = require("../utils/email");
const env_1 = require("../config/env");
const auth_1 = require("../middleware/auth");
const VERIFICATION_CODE_EXPIRY_MINUTES = 10;
const VERIFICATION_MAX_ATTEMPTS = 5;
const PASSWORD_RESET_EXPIRY_MINUTES = 30;
exports.ACCOUNT_SETUP_EXPIRY_HOURS = 72;
// Minimum gap between two emails of the same kind to one account
const EMAIL_RESEND_COOLDOWN_MS = 60 * 1000;
const normalizeEmail = (email) => email.trim().toLowerCase();
const sha256 = (value) => crypto_1.default.createHash("sha256").update(value).digest("hex");
const safeEqual = (a, b) => {
    const left = Buffer.from(a);
    const right = Buffer.from(b);
    return left.length === right.length && crypto_1.default.timingSafeEqual(left, right);
};
const isDuplicateKeyError = (error) => error?.code === 11000;
// Compared against for unknown emails so a login costs the same bcrypt time
// whether or not the account exists (no timing oracle for registered emails).
const DUMMY_PASSWORD_HASH = bcryptjs_1.default.hashSync(crypto_1.default.randomBytes(16).toString("hex"), User_1.PASSWORD_HASH_ROUNDS);
const toUserResponse = (user) => ({
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
const inBackground = (label, task) => {
    setImmediate(() => {
        task().catch((error) => console.error(`${label}:`, error));
    });
};
// Update filter matching accounts whose last email of this kind is older than
// the cooldown. Putting it in the update itself makes the claim atomic: of two
// parallel requests only one modifies the document and sends.
const cooldownElapsed = (field) => ({
    $or: [
        { [field]: null },
        { [field]: { $lte: new Date(Date.now() - EMAIL_RESEND_COOLDOWN_MS) } },
    ],
});
const newVerificationCode = () => {
    const code = crypto_1.default.randomInt(100000, 1000000).toString();
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
const issueVerificationCode = async (user) => {
    const { code, fields } = newVerificationCode();
    const claimed = await User_1.default.updateOne({
        _id: user._id,
        isVerified: false,
        ...cooldownElapsed("emailVerificationSentAt"),
    }, { $set: fields });
    if (claimed.modifiedCount !== 1)
        return false;
    await (0, email_1.sendVerificationCodeEmail)({
        email: user.email,
        name: user.name,
        code,
        expiresMinutes: VERIFICATION_CODE_EXPIRY_MINUTES,
    });
    return true;
};
const resetUrlFor = (token) => `${(0, env_1.getFrontendUrl)()}/reset-password?token=${token}`;
const newResetToken = (ttlMs) => {
    const token = crypto_1.default.randomBytes(32).toString("hex");
    return {
        token,
        fields: {
            passwordResetTokenHash: (0, session_1.hashToken)(token),
            passwordResetExpiresAt: new Date(Date.now() + ttlMs),
            passwordResetSentAt: new Date(),
        },
    };
};
// Used by the admin "add lawyer" flow and the temp-password migration: the
// account gets a random password nobody knows, and the lawyer chooses their own
// through this link.
const sendAccountSetupLink = async (user) => {
    const { token, fields } = newResetToken(exports.ACCOUNT_SETUP_EXPIRY_HOURS * 60 * 60 * 1000);
    await User_1.default.updateOne({ _id: user._id }, { $set: fields });
    await (0, email_1.sendAccountSetupEmail)({
        email: user.email,
        name: user.name,
        setupUrl: resetUrlFor(token),
        expiresHours: exports.ACCOUNT_SETUP_EXPIRY_HOURS,
    });
};
exports.sendAccountSetupLink = sendAccountSetupLink;
const notifyPasswordChanged = (user) => 
// A failed notice must not undo a successful password change
inBackground("Password changed notice failed", () => (0, email_1.sendPasswordChangedEmail)({ email: user.email, name: user.name }));
const register = async (req, res) => {
    try {
        const { name, email, password, role, barId, phone } = req.body;
        const normalizedEmail = normalizeEmail(email);
        const selectedRole = role === "lawyer" ? "lawyer" : "client";
        const existingUser = await User_1.default.findOne({ email: normalizedEmail })
            .select("name email isVerified")
            .lean();
        if (existingUser) {
            if (!existingUser.isVerified) {
                inBackground("Verification email failed", () => issueVerificationCode(existingUser));
                return res.status(200).json({
                    message: "This email is waiting for verification. Enter the code we emailed you, or resend it.",
                    verificationRequired: true,
                    email: existingUser.email,
                });
            }
            return res.status(409).json({ message: "User already exists" });
        }
        // Account and first code in one write
        const { code, fields } = newVerificationCode();
        let user;
        try {
            user = await User_1.default.create({
                name,
                email: normalizedEmail,
                password,
                role: selectedRole,
                barId,
                phone,
                isVerified: false,
                ...fields,
            });
        }
        catch (error) {
            // Two sign-ups for the same email raced past the lookup above
            if (isDuplicateKeyError(error))
                return res.status(409).json({ message: "User already exists" });
            throw error;
        }
        let emailSent = true;
        try {
            await (0, email_1.sendVerificationCodeEmail)({
                email: user.email,
                name: user.name,
                code,
                expiresMinutes: VERIFICATION_CODE_EXPIRY_MINUTES,
            });
        }
        catch (error) {
            // The account exists; the user can use "Resend code" on the verify page
            emailSent = false;
            console.error("Verification email failed:", error);
        }
        res.status(201).json({
            message: emailSent
                ? "Registration successful. Check your email for a verification code."
                : 'Registration successful, but we could not send the verification email. Use "Resend code" to try again.',
            verificationRequired: true,
            email: user.email,
        });
    }
    catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
exports.register = register;
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User_1.default.findOne({ email: normalizeEmail(email) })
            .select(`+password ${auth_1.AUTH_USER_FIELDS}`)
            .lean();
        // Check the password before revealing anything about the account (such as
        // whether it is verified), and before sending any email.
        const isPasswordValid = await bcryptjs_1.default.compare(password, user?.password ?? DUMMY_PASSWORD_HASH);
        if (!user || !isPasswordValid) {
            return res.status(401).json({ message: "Invalid credentials" });
        }
        if (!user.isVerified) {
            inBackground("Verification email failed", () => issueVerificationCode(user));
            return res.status(403).json({
                message: "Please verify your email address before logging in.",
                verificationRequired: true,
                email: user.email,
            });
        }
        const accessTokenExpiresAt = await (0, session_1.issueSession)(req, res, user);
        res.json({
            message: "Login successful",
            user: toUserResponse(user),
            accessTokenExpiresAt,
        });
    }
    catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
exports.login = login;
// Public on purpose: it must work with an expired access token.
const logout = async (req, res) => {
    try {
        const refreshToken = req.cookies.refreshToken;
        if (refreshToken) {
            await (0, session_1.revokeSession)(refreshToken);
        }
    }
    catch (error) {
        console.error("Logout error:", error);
    }
    finally {
        (0, session_1.clearAuthCookies)(res);
    }
    res.json({ message: "Logout successful" });
};
exports.logout = logout;
const getProfile = async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ message: "Not authenticated" });
    }
    res.json({ user: toUserResponse(req.user) });
};
exports.getProfile = getProfile;
// Exchanges the refresh cookie for a new access token AND a new refresh token.
// A refresh token presented again after it was rotated means it leaked, so
// every session of that user is revoked.
const refreshToken = async (req, res) => {
    const token = req.cookies.refreshToken;
    const reject = (message) => {
        (0, session_1.clearAuthCookies)(res);
        return res.status(401).json({ message, code: "REFRESH_FAILED" });
    };
    if (!token) {
        return res
            .status(401)
            .json({ message: "Refresh token required", code: "REFRESH_FAILED" });
    }
    try {
        let decoded;
        try {
            decoded = (0, jwt_1.verifyRefreshToken)(token);
        }
        catch {
            return reject("Invalid refresh token");
        }
        // Tokens from before session versioning lack these claims
        if (typeof decoded.tv !== "number" || typeof decoded.sae !== "number") {
            return reject("Session format is outdated");
        }
        const user = await User_1.default.findById(decoded.userId)
            .select(auth_1.AUTH_USER_FIELDS)
            .lean();
        if (!user || (user.tokenVersion ?? 0) !== decoded.tv) {
            await (0, session_1.revokeSession)(token);
            return reject("Session is no longer valid");
        }
        const result = await (0, session_1.rotateSession)(req, res, user, token, decoded.sae);
        if (result.status === "unknown") {
            return reject("Session not found");
        }
        if (result.status === "reused") {
            console.warn(`[auth] Refresh token reuse detected for user ${user._id}; revoking all sessions`);
            await (0, session_1.revokeAllSessions)(user._id);
            return reject("Session revoked");
        }
        res.json({
            message: "Token refreshed successfully",
            user: toUserResponse(user),
            accessTokenExpiresAt: result.accessTokenExpiresAt,
        });
    }
    catch (error) {
        console.error("Refresh token error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
exports.refreshToken = refreshToken;
const verifyEmail = async (req, res) => {
    try {
        const { email, code } = req.body;
        const normalizedEmail = normalizeEmail(email);
        // Count the attempt before comparing, atomically, so parallel guesses
        // cannot slip past the limit.
        const candidate = await User_1.default.findOneAndUpdate({
            email: normalizedEmail,
            isVerified: false,
            emailVerificationExpiresAt: { $gt: new Date() },
            emailVerificationAttempts: {
                $not: { $gte: VERIFICATION_MAX_ATTEMPTS },
            },
        }, { $inc: { emailVerificationAttempts: 1 } }, { returnDocument: "after" })
            .select("+emailVerificationCodeHash +emailVerificationAttempts")
            .lean();
        if (!candidate) {
            // Slow path only: explain why nothing matched
            const state = await User_1.default.findOne({ email: normalizedEmail })
                .select("isVerified +emailVerificationAttempts")
                .lean();
            if (state?.isVerified) {
                // No user data here: this endpoint is unauthenticated
                return res
                    .status(409)
                    .json({ message: "This email is already verified. Please log in." });
            }
            if (state &&
                (state.emailVerificationAttempts ?? 0) >= VERIFICATION_MAX_ATTEMPTS) {
                return res
                    .status(429)
                    .json({
                    message: "Too many incorrect attempts. Please resend a new code.",
                });
            }
            if (state) {
                return res
                    .status(400)
                    .json({
                    message: "Verification code expired. Please resend the code.",
                });
            }
            return res
                .status(400)
                .json({ message: "Invalid or expired verification code." });
        }
        const codeHash = candidate.emailVerificationCodeHash;
        if (!codeHash || !safeEqual(sha256(code.trim()), codeHash)) {
            if ((candidate.emailVerificationAttempts ?? 0) >= VERIFICATION_MAX_ATTEMPTS) {
                await User_1.default.updateOne({ _id: candidate._id }, {
                    $unset: {
                        emailVerificationCodeHash: 1,
                        emailVerificationExpiresAt: 1,
                    },
                });
                return res
                    .status(429)
                    .json({
                    message: "Too many incorrect attempts. Please resend a new code.",
                });
            }
            return res
                .status(400)
                .json({ message: "Invalid or expired verification code." });
        }
        // Conditional on the same code so a code replaced meanwhile cannot verify
        const user = await User_1.default.findOneAndUpdate({
            _id: candidate._id,
            isVerified: false,
            emailVerificationCodeHash: codeHash,
        }, {
            $set: { isVerified: true, emailVerificationAttempts: 0 },
            $unset: { emailVerificationCodeHash: 1, emailVerificationExpiresAt: 1 },
        }, { returnDocument: "after" })
            .select(auth_1.AUTH_USER_FIELDS)
            .lean();
        if (!user) {
            return res
                .status(400)
                .json({ message: "Invalid or expired verification code." });
        }
        const accessTokenExpiresAt = await (0, session_1.issueSession)(req, res, user);
        res.json({
            message: "Email verified successfully.",
            user: toUserResponse(user),
            accessTokenExpiresAt,
        });
    }
    catch (error) {
        console.error("Email verification error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
exports.verifyEmail = verifyEmail;
// The answer is the same, and sent before any lookup, whether or not the
// account exists or the cooldown applies (no enumeration, no timing signal).
const resendVerificationCode = async (req, res) => {
    const email = normalizeEmail(req.body.email);
    res.json({
        message: "If that account is waiting for verification, a new code has been sent.",
    });
    inBackground("Resend verification code failed", async () => {
        const user = await User_1.default.findOne({ email, isVerified: false })
            .select("name email")
            .lean();
        if (user)
            await issueVerificationCode(user);
    });
};
exports.resendVerificationCode = resendVerificationCode;
const forgotPassword = async (req, res) => {
    let userId;
    let resetTokenHash;
    try {
        const email = normalizeEmail(req.body.email);
        const user = await User_1.default.findOne({ email }).select("name email").lean();
        if (!user) {
            return res
                .status(404)
                .json({ message: "No account was found for that email address." });
        }
        const { token, fields } = newResetToken(PASSWORD_RESET_EXPIRY_MINUTES * 60 * 1000);
        userId = user._id;
        resetTokenHash = fields.passwordResetTokenHash;
        const claimed = await User_1.default.updateOne({ _id: user._id, ...cooldownElapsed("passwordResetSentAt") }, { $set: fields });
        if (claimed.modifiedCount !== 1) {
            return res
                .status(429)
                .json({
                message: "Please wait a minute before requesting another reset email.",
            });
        }
        await (0, email_1.sendPasswordResetEmail)({
            email: user.email,
            name: user.name,
            resetUrl: resetUrlFor(token),
            expiresMinutes: PASSWORD_RESET_EXPIRY_MINUTES,
        });
        return res.json({
            message: "A password reset link has been sent to your email address.",
        });
    }
    catch (error) {
        if (userId && resetTokenHash) {
            await User_1.default.updateOne({ _id: userId, passwordResetTokenHash: resetTokenHash }, {
                $unset: {
                    passwordResetTokenHash: 1,
                    passwordResetExpiresAt: 1,
                    passwordResetSentAt: 1,
                },
            }).catch((cleanupError) => console.error("Forgot password cleanup error:", cleanupError));
        }
        console.error("Forgot password error:", error);
        return res
            .status(502)
            .json({
            message: "We could not send the reset email right now. Please try again.",
        });
    }
};
exports.forgotPassword = forgotPassword;
const resetPassword = async (req, res) => {
    try {
        const { token, password } = req.body;
        const tokenFilter = {
            passwordResetTokenHash: (0, session_1.hashToken)(token),
            passwordResetExpiresAt: { $gt: new Date() },
        };
        const invalidLink = () => res
            .status(400)
            .json({
            message: "This reset link is invalid or has expired. Request a new one.",
        });
        // Cheap indexed check first so bogus tokens never cost a bcrypt hash
        if (!(await User_1.default.exists(tokenFilter))) {
            return invalidLink();
        }
        const passwordHash = await (0, User_1.hashPassword)(password);
        // Consuming the token and setting the password is one write: a link used
        // twice in parallel succeeds only once.
        const user = await User_1.default.findOneAndUpdate(tokenFilter, {
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
        }, { returnDocument: "after" })
            .select("name email")
            .lean();
        if (!user) {
            return invalidLink();
        }
        await (0, session_1.revokeAllSessions)(user._id);
        (0, session_1.clearAuthCookies)(res);
        notifyPasswordChanged(user);
        res.json({
            message: "Your password has been reset. You can now log in with the new password.",
        });
    }
    catch (error) {
        console.error("Reset password error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
exports.resetPassword = resetPassword;
const changePassword = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ message: "Not authenticated" });
        }
        const { currentPassword, newPassword } = req.body;
        if (currentPassword === newPassword) {
            return res
                .status(400)
                .json({
                message: "New password must be different from the current password.",
            });
        }
        const current = await User_1.default.findById(req.user._id)
            .select("+password")
            .lean();
        if (!current?.password) {
            return res.status(404).json({ message: "User not found" });
        }
        if (!(await bcryptjs_1.default.compare(currentPassword, current.password))) {
            return res
                .status(400)
                .json({ message: "Current password is incorrect." });
        }
        const passwordHash = await (0, User_1.hashPassword)(newPassword);
        // Conditional on the hash we verified against, so two parallel changes
        // cannot both succeed, and tokenVersion moves in the same write.
        const user = await User_1.default.findOneAndUpdate({ _id: current._id, password: current.password }, {
            $set: {
                password: passwordHash,
                passwordNeedsChange: false,
                passwordChangedAt: new Date(),
            },
            $inc: { tokenVersion: 1 },
        }, { returnDocument: "after" })
            .select(auth_1.AUTH_USER_FIELDS)
            .lean();
        if (!user) {
            return res
                .status(409)
                .json({
                message: "Your password was changed from another session. Please sign in again.",
            });
        }
        // Sign out every other device, keep this one signed in with fresh tokens
        await (0, session_1.revokeAllSessions)(user._id);
        const accessTokenExpiresAt = await (0, session_1.issueSession)(req, res, user);
        notifyPasswordChanged(user);
        res.json({
            message: "Password changed successfully.",
            user: toUserResponse(user),
            accessTokenExpiresAt,
        });
    }
    catch (error) {
        console.error("Change password error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
};
exports.changePassword = changePassword;
//# sourceMappingURL=authController.js.map