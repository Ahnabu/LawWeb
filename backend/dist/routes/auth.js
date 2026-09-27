"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authController_1 = require("../controllers/authController");
const auth_1 = require("../middleware/auth");
const validation_1 = require("../middleware/validation");
const router = express_1.default.Router();
// Public routes (rate limited in server.ts)
router.post('/register', (0, validation_1.validateRequest)(validation_1.registerSchema), authController_1.register);
router.post('/login', (0, validation_1.validateRequest)(validation_1.loginSchema), authController_1.login);
router.post('/refresh', authController_1.refreshToken);
// Works with an expired access token so a stale session can always sign out
router.post('/logout', authController_1.logout);
router.post('/verify-email', (0, validation_1.validateRequest)(validation_1.verifyEmailSchema), authController_1.verifyEmail);
router.post('/resend-verification-code', (0, validation_1.validateRequest)(validation_1.emailOnlySchema), authController_1.resendVerificationCode);
router.post('/forgot-password', (0, validation_1.validateRequest)(validation_1.emailOnlySchema), authController_1.forgotPassword);
router.post('/reset-password', (0, validation_1.validateRequest)(validation_1.resetPasswordSchema), authController_1.resetPassword);
// Protected routes
router.get('/profile', auth_1.authenticateToken, authController_1.getProfile);
router.post('/change-password', auth_1.authenticateToken, (0, validation_1.validateRequest)(validation_1.changePasswordSchema), authController_1.changePassword);
exports.default = router;
//# sourceMappingURL=auth.js.map