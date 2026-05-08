"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorizeRoles = exports.authenticateToken = void 0;
const jwt_1 = require("../utils/jwt");
const User_1 = __importDefault(require("../models/User"));
const authenticateToken = async (req, res, next) => {
    try {
        const accessToken = req.cookies.accessToken;
        if (!accessToken) {
            return res.status(401).json({ message: 'Access token required' });
        }
        const decoded = (0, jwt_1.verifyAccessToken)(accessToken);
        const user = await User_1.default.findById(decoded.userId).select('-password');
        if (!user) {
            return res.status(401).json({ message: 'User not found' });
        }
        req.user = user;
        next();
    }
    catch (error) {
        // If access token is expired, try refresh token
        const refreshToken = req.cookies.refreshToken;
        if (!refreshToken) {
            return res.status(401).json({ message: 'Authentication required' });
        }
        try {
            const decoded = (0, jwt_1.verifyRefreshToken)(refreshToken);
            const user = await User_1.default.findById(decoded.userId).select('-password');
            if (!user) {
                return res.status(401).json({ message: 'User not found' });
            }
            // Generate new access token
            const newAccessToken = (0, jwt_1.generateAccessToken)(user);
            // Set new access token cookie
            res.cookie('accessToken', newAccessToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 60 * 60 * 1000, // 1 hour
                domain: process.env.COOKIE_DOMAIN,
            });
            req.user = user;
            next();
        }
        catch (refreshError) {
            return res.status(401).json({ message: 'Invalid refresh token' });
        }
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