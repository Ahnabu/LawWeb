"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRequest = exports.formatZodIssues = exports.reorderGallerySchema = exports.updateGalleryImageSchema = exports.galleryImageIdSchema = exports.grantDelegationSchema = exports.updateDelegationSchema = exports.inviteAssistantSchema = exports.updateStaffSchema = exports.createStaffSchema = exports.updateRoleSchema = exports.createRoleSchema = exports.auditLogListSchema = exports.auditLogQueryFields = exports.contactMessageSchema = exports.contentRevisionSchema = exports.saveContentDraftSchema = exports.contentPageSchema = exports.changePasswordSchema = exports.resetPasswordSchema = exports.verifyEmailSchema = exports.emailOnlySchema = exports.loginSchema = exports.registerSchema = exports.passwordSchema = void 0;
const zod_1 = require("zod");
const contentSchemas_1 = require("../config/contentSchemas");
const permissions_1 = require("../access/permissions");
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
// ── Contact page form ─────────────────────────────────────────────────────────
// `website` is a honeypot the form hides from people; the controller drops
// submissions that fill it.
exports.contactMessageSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().trim().min(2, 'Please enter your name').max(100, 'Name too long'),
        email: emailField,
        phone: zod_1.z
            .string()
            .trim()
            .max(30, 'Phone number too long')
            .regex(/^\+?[\d\s\-()]*$/, 'Enter a valid phone number')
            .optional(),
        subject: zod_1.z.string().trim().max(150, 'Subject too long').optional(),
        message: zod_1.z
            .string()
            .trim()
            .min(10, 'Message must be at least 10 characters')
            .max(2000, 'Message must be at most 2000 characters'),
        website: zod_1.z.string().max(200).optional(),
    }),
});
// ── Audit logs (admin) ────────────────────────────────────────────────────────
const optionalQueryText = (max) => zod_1.z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? undefined : v), zod_1.z.string().trim().max(max).optional());
const optionalQueryDate = zod_1.z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? undefined : v), zod_1.z.coerce.date({ message: 'Invalid date' }).optional());
exports.auditLogQueryFields = zod_1.z.object({
    page: zod_1.z.coerce.number().int().positive().max(100000).optional(),
    limit: zod_1.z.coerce.number().int().positive().max(100).optional(),
    category: optionalQueryText(30),
    action: optionalQueryText(80),
    actorRole: zod_1.z.preprocess((v) => (v === '' || v === 'all' ? undefined : v), zod_1.z.enum(['admin', 'lawyer', 'client', 'staff', 'anonymous', 'system']).optional()),
    actor: zod_1.z.preprocess((v) => (v === '' ? undefined : v), zod_1.z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid actor ID').optional()),
    // The lawyer a staff member acted for
    onBehalfOf: zod_1.z.preprocess((v) => (v === '' ? undefined : v), zod_1.z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid lawyer ID').optional()),
    search: optionalQueryText(100),
    from: optionalQueryDate,
    to: optionalQueryDate,
});
exports.auditLogListSchema = zod_1.z.object({ query: exports.auditLogQueryFields });
// ── Roles and staff (super-admin) ─────────────────────────────────────────────
// Permission keys are checked against the catalog in the controller, so the
// response can list exactly which keys are unknown.
const roleFields = {
    name: zod_1.z.string().trim().min(2, 'Role name must be at least 2 characters').max(60, 'Role name must be at most 60 characters'),
    description: zod_1.z.string().trim().max(300, 'Description must be at most 300 characters').optional(),
    permissions: zod_1.z.array(zod_1.z.string().max(60)).max(100),
};
exports.createRoleSchema = zod_1.z.object({ body: zod_1.z.object(roleFields) });
exports.updateRoleSchema = zod_1.z.object({ body: zod_1.z.object(roleFields).partial() });
const objectId = zod_1.z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid ID');
const staffPhone = zod_1.z
    .string()
    .trim()
    .max(30, 'Phone number too long')
    .regex(/^\+?[\d\s\-()]*$/, 'Enter a valid phone number');
exports.createStaffSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Name too long'),
        email: emailField,
        phone: staffPhone.optional(),
        staffRoleId: objectId.nullable().optional(),
    }),
});
exports.updateStaffSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Name too long').optional(),
        phone: staffPhone.optional(),
        staffRoleId: objectId.nullable().optional(),
    }),
});
// ── Lawyer assistants (delegations) ───────────────────────────────────────────
// Only lawyer-scoped keys can be delegated; firm-only or unknown keys are a 400.
const delegationPermissions = zod_1.z
    .array(zod_1.z.string().max(60))
    .min(1, 'Choose at least one permission')
    .max(permissions_1.LAWYER_SCOPED.size)
    .refine((perms) => perms.every((p) => permissions_1.LAWYER_SCOPED.has(p)), 'Only permissions for a lawyer\'s own work can be given to an assistant')
    .transform((perms) => [...new Set(perms)]);
exports.inviteAssistantSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: emailField,
        // Required by the controller only when the email is new to the firm
        name: zod_1.z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Name too long').optional().or(zod_1.z.literal('')),
        phone: staffPhone.optional(),
        permissions: delegationPermissions,
    }),
});
exports.updateDelegationSchema = zod_1.z.object({ body: zod_1.z.object({ permissions: delegationPermissions }) });
exports.grantDelegationSchema = zod_1.z.object({
    body: zod_1.z.object({ lawyerId: objectId, permissions: delegationPermissions }),
});
// ── Photo gallery (admin) ─────────────────────────────────────────────────────
// Images are created by the upload (POST /api/admin/gallery, multipart); these
// cover editing their text, publishing and ordering.
const galleryText = (max, label) => zod_1.z.object({
    en: zod_1.z.string().trim().max(max, `${label} (English) must be at most ${max} characters`).optional(),
    bn: zod_1.z.string().trim().max(max, `${label} (Bangla) must be at most ${max} characters`).optional(),
});
const galleryImageParams = zod_1.z.object({ imageId: objectId });
exports.galleryImageIdSchema = zod_1.z.object({ params: galleryImageParams });
exports.updateGalleryImageSchema = zod_1.z.object({
    params: galleryImageParams,
    body: zod_1.z
        .object({
        title: galleryText(120, 'Title').optional(),
        description: galleryText(600, 'Description').optional(),
        isPublished: zod_1.z.boolean().optional(),
    })
        .refine((b) => b.title !== undefined || b.description !== undefined || b.isPublished !== undefined, 'Nothing to update'),
});
exports.reorderGallerySchema = zod_1.z.object({
    body: zod_1.z.object({
        order: zod_1.z
            .array(objectId)
            .min(1, 'order must list at least one image')
            .max(1000)
            .refine((ids) => new Set(ids).size === ids.length, 'order contains duplicate IDs'),
    }),
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