"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyRefreshToken = exports.verifyAccessToken = exports.generateRefreshToken = exports.generateAccessToken = exports.SESSION_ABSOLUTE_TTL_MS = exports.REFRESH_IDLE_TTL_MS = exports.ACCESS_TOKEN_TTL_MS = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
// Short-lived: the frontend refreshes it transparently (see frontend/lib/http.ts)
exports.ACCESS_TOKEN_TTL_MS = 15 * 60 * 1000;
// A device idle this long must sign in again
exports.REFRESH_IDLE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
// A session never outlives this, however active it is
exports.SESSION_ABSOLUTE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const ALGORITHM = 'HS256';
const signOptions = {
    issuer: 'lawweb-backend',
    audience: 'lawweb-client',
};
const basePayload = (user) => ({
    userId: user._id.toString(),
    role: user.role,
    tv: user.tokenVersion ?? 0,
});
const generateAccessToken = (user) => jsonwebtoken_1.default.sign(basePayload(user), process.env.JWT_SECRET, {
    ...signOptions,
    algorithm: ALGORITHM,
    expiresIn: Math.floor(exports.ACCESS_TOKEN_TTL_MS / 1000),
});
exports.generateAccessToken = generateAccessToken;
const generateRefreshToken = (user, jti, expiresAt, absoluteExpiresAt) => {
    const payload = {
        ...basePayload(user),
        sae: Math.floor(absoluteExpiresAt.getTime() / 1000),
    };
    return jsonwebtoken_1.default.sign(payload, process.env.JWT_REFRESH_SECRET, {
        ...signOptions,
        algorithm: ALGORITHM,
        expiresIn: Math.max(1, Math.floor((expiresAt.getTime() - Date.now()) / 1000)),
        jwtid: jti,
    });
};
exports.generateRefreshToken = generateRefreshToken;
const verifyAccessToken = (token) => jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET, { ...signOptions, algorithms: [ALGORITHM] });
exports.verifyAccessToken = verifyAccessToken;
const verifyRefreshToken = (token) => jsonwebtoken_1.default.verify(token, process.env.JWT_REFRESH_SECRET, { ...signOptions, algorithms: [ALGORITHM] });
exports.verifyRefreshToken = verifyRefreshToken;
//# sourceMappingURL=jwt.js.map