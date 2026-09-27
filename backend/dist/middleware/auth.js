"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorizeRoles = exports.authenticateToken = exports.AUTH_USER_FIELDS = void 0;
const jwt_1 = require("../utils/jwt");
const User_1 = __importDefault(require("../models/User"));
// Everything controllers read from req.user, plus what the checks below need
exports.AUTH_USER_FIELDS = 'name email role barId phone specialization profileImageUrl isVerified passwordNeedsChange tokenVersion';
// Error codes the frontend's request queue (frontend/lib/http.ts) reacts to:
// any 401 triggers one refresh + retry; PASSWORD_CHANGE_REQUIRED does not.
const authenticateToken = async (req, res, next) => {
    const accessToken = req.cookies.accessToken;
    if (!accessToken) {
        return res.status(401).json({ message: 'Authentication required', code: 'TOKEN_MISSING' });
    }
    let decoded;
    try {
        decoded = (0, jwt_1.verifyAccessToken)(accessToken);
    }
    catch (error) {
        const expired = error.name === 'TokenExpiredError';
        return res.status(401).json({
            message: expired ? 'Access token expired' : 'Invalid access token',
            code: expired ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID',
        });
    }
    try {
        // Runs on every authenticated request: lean read of just what the routes use
        const user = await User_1.default.findById(decoded.userId).select(exports.AUTH_USER_FIELDS).lean();
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
    }
    catch (error) {
        next(error);
    }
};
exports.authenticateToken = authenticateToken;
const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: 'Authentication required' });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ message: 'Insufficient permissions' });
        }
        next();
    };
};
exports.authorizeRoles = authorizeRoles;
//# sourceMappingURL=auth.js.map