"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRequest = exports.formatZodIssues = exports.contentRevisionSchema = exports.saveContentDraftSchema = exports.contentPageSchema = exports.changePasswordSchema = exports.resetPasswordSchema = exports.verifyEmailSchema = exports.emailOnlySchema = exports.loginSchema = exports.registerSchema = exports.passwordSchema = void 0;
const zod_1 = require("zod");
const contentSchemas_1 = require("../config/contentSchemas");
// Shared by register, reset and change password. bcrypt ignores bytes past 72.
exports.passwordSchema = zod_1.z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password must be at most 72 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d])/, 'Password must contain uppercase, lowercase, number and special character');
const emailField = zod_1.z.string().trim().email('Invalid email format').max(254);
exports.registerSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Name too long'),
        email: emailField,
        password: exports.passwordSchema,
        role: zod_1.z.enum(['lawyer', 'client']).default('client'),
        barId: zod_1.z.string().max(50).optional(),
        phone: zod_1.z.string().regex(/^(\+?8801[3-9]\d{8}|01[3-9]\d{8})$/, 'Enter a valid Bangladeshi phone number, such as +8801XXXXXXXXX'),
    }),
});
exports.loginSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: emailField,
        password: zod_1.z.string().min(1, 'Password is required').max(200),
    }),
});
exports.emailOnlySchema = zod_1.z.object({
    body: zod_1.z.object({ email: emailField }),
});
exports.verifyEmailSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: emailField,
        code: zod_1.z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit code from your email'),
    }),
});
exports.resetPasswordSchema = zod_1.z.object({
    body: zod_1.z.object({
        token: zod_1.z.string().regex(/^[a-f0-9]{64}$/, 'This reset link is invalid. Request a new one.'),
        password: exports.passwordSchema,
    }),
});
exports.changePasswordSchema = zod_1.z.object({
    body: zod_1.z.object({
        currentPassword: zod_1.z.string().min(1, 'Current password is required').max(200),
        newPassword: exports.passwordSchema,
    }),
});
// ── CMS content ───────────────────────────────────────────────────────────────
const contentPageKeyParam = zod_1.z.object({ pageKey: zod_1.z.enum(contentSchemas_1.CONTENT_PAGE_KEYS) });
exports.contentPageSchema = zod_1.z.object({ params: contentPageKeyParam });
// Page-specific shape is validated in the controller against contentPageSchemas
exports.saveContentDraftSchema = zod_1.z.object({
    params: contentPageKeyParam,
    body: zod_1.z.object({ data: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()) }),
});
exports.contentRevisionSchema = zod_1.z.object({
    params: contentPageKeyParam.extend({ version: zod_1.z.coerce.number().int().positive() }),
});
const formatZodIssues = (error) => error.issues.map((issue) => ({
    field: issue.path.join('.'),
    message: issue.message,
}));
exports.formatZodIssues = formatZodIssues;
const validateRequest = (schema) => {
    return (req, res, next) => {
        try {
            schema.parse(req);
            next();
        }
        catch (error) {
            if (error instanceof zod_1.z.ZodError) {
                return res.status(400).json({
                    message: 'Validation failed',
                    errors: (0, exports.formatZodIssues)(error),
                });
            }
            // Non-Zod error — pass to Express error handler
            next(error);
        }
    };
};
exports.validateRequest = validateRequest;
//# sourceMappingURL=validation.js.map