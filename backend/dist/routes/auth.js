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
// Public routes
router.post('/register', (0, validation_1.validateRequest)(validation_1.registerSchema), authController_1.register);
router.post('/login', (0, validation_1.validateRequest)(validation_1.loginSchema), authController_1.login);
router.post('/refresh', authController_1.refreshToken);
router.post('/verify-email', authController_1.verifyEmail);
router.post('/resend-verification-code', authController_1.resendVerificationCode);
router.post('/verify-code', authController_1.verifyEmail);
router.post('/resend-code', authController_1.resendVerificationCode);
// Protected routes
router.post('/logout', auth_1.authenticateToken, authController_1.logout);
router.get('/profile', auth_1.authenticateToken, authController_1.getProfile);
router.post('/change-password', auth_1.authenticateToken, authController_1.changePassword);
exports.default = router;
//# sourceMappingURL=auth.js.map