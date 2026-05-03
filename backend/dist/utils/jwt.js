"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyRefreshToken = exports.verifyAccessToken = exports.generateRefreshToken = exports.generateAccessToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const generateAccessToken = (user) => {
    const payload = {
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
    };
    return jsonwebtoken_1.default.sign(payload, process.env.JWT_SECRET, {
        expiresIn: '15m', // Short-lived access token
        issuer: 'lawweb-backend',
        audience: 'lawweb-client',
    });
};
exports.generateAccessToken = generateAccessToken;
const generateRefreshToken = (user) => {
    const payload = {
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
    };
    return jsonwebtoken_1.default.sign(payload, process.env.JWT_REFRESH_SECRET, {
        expiresIn: '7d', // Longer-lived refresh token
        issuer: 'lawweb-backend',
        audience: 'lawweb-client',
    });
};
exports.generateRefreshToken = generateRefreshToken;
const verifyAccessToken = (token) => {
    return jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET, {
        issuer: 'lawweb-backend',
        audience: 'lawweb-client',
    });
};
exports.verifyAccessToken = verifyAccessToken;
const verifyRefreshToken = (token) => {
    return jsonwebtoken_1.default.verify(token, process.env.JWT_REFRESH_SECRET, {
        issuer: 'lawweb-backend',
        audience: 'lawweb-client',
    });
};
exports.verifyRefreshToken = verifyRefreshToken;
//# sourceMappingURL=jwt.js.map