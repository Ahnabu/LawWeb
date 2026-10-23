import { z } from 'zod';
import { CONTENT_PAGE_KEYS } from '../config/contentSchemas';
import { LAWYER_SCOPED, type Permission } from '../access/permissions';

// Shared by register, reset and change password. bcrypt ignores bytes past 72.
export const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters')
  .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d])/,
    'Password must contain uppercase, lowercase, number and special character');

const emailField = z.string().trim().email('Invalid email format').max(254);

export const registerSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Name too long'),
    email: emailField,
    password: passwordSchema,
    role: z.enum(['lawyer', 'client']).default('client'),
    barId: z.string().max(50).optional(),
    phone: z.string().regex(/^(\+?8801[3-9]\d{8}|01[3-9]\d{8})$/, 'Enter a valid Bangladeshi phone number, such as +8801XXXXXXXXX'),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: emailField,
    password: z.string().min(1, 'Password is required').max(200),
  }),
});

export const emailOnlySchema = z.object({
  body: z.object({ email: emailField }),
});

export const verifyEmailSchema = z.object({
  body: z.object({
    email: emailField,
    code: z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit code from your email'),
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().regex(/^[a-f0-9]{64}$/, 'This reset link is invalid. Request a new one.'),
    password: passwordSchema,
  }),
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, 'Current password is required').max(200),
    newPassword: passwordSchema,
  }),
});

// ── CMS content ───────────────────────────────────────────────────────────────
const contentPageKeyParam = z.object({ pageKey: z.enum(CONTENT_PAGE_KEYS) });

export const contentPageSchema = z.object({ params: contentPageKeyParam });

// Page-specific shape is validated in the controller against contentPageSchemas
export const saveContentDraftSchema = z.object({
  params: contentPageKeyParam,
  body: z.object({ data: z.record(z.string(), z.unknown()) }),
});

export const contentRevisionSchema = z.object({
  params: contentPageKeyParam.extend({ version: z.coerce.number().int().positive() }),
});

// ── Contact page form ─────────────────────────────────────────────────────────
// `website` is a honeypot the form hides from people; the controller drops
// submissions that fill it.
export const contactMessageSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, 'Please enter your name').max(100, 'Name too long'),
    email: emailField,
    phone: z
      .string()
      .trim()
      .max(30, 'Phone number too long')
      .regex(/^\+?[\d\s\-()]*$/, 'Enter a valid phone number')
      .optional(),
    subject: z.string().trim().max(150, 'Subject too long').optional(),
    message: z
      .string()
      .trim()
      .min(10, 'Message must be at least 10 characters')
      .max(2000, 'Message must be at most 2000 characters'),
    website: z.string().max(200).optional(),
  }),
});

// ── Audit logs (admin) ────────────────────────────────────────────────────────
const optionalQueryText = (max: number) =>
  z.preprocess((v) => (typeof v === 'string' && v.trim() === '' ? undefined : v), z.string().trim().max(max).optional());
const optionalQueryDate = z.preprocess(
  (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
  z.coerce.date({ message: 'Invalid date' }).optional()
);

export const auditLogQueryFields = z.object({
  page: z.coerce.number().int().positive().max(100000).optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  category: optionalQueryText(30),
  action: optionalQueryText(80),
  actorRole: z.preprocess(
    (v) => (v === '' || v === 'all' ? undefined : v),
    z.enum(['admin', 'lawyer', 'client', 'staff', 'anonymous', 'system']).optional()
  ),
  actor: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid actor ID').optional()
  ),
  // The lawyer a staff member acted for
  onBehalfOf: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid lawyer ID').optional()
  ),
  search: optionalQueryText(100),
  from: optionalQueryDate,
  to: optionalQueryDate,
});

export const auditLogListSchema = z.object({ query: auditLogQueryFields });

// ── Roles and staff (super-admin) ─────────────────────────────────────────────
// Permission keys are checked against the catalog in the controller, so the
// response can list exactly which keys are unknown.
const roleFields = {
  name: z.string().trim().min(2, 'Role name must be at least 2 characters').max(60, 'Role name must be at most 60 characters'),
  description: z.string().trim().max(300, 'Description must be at most 300 characters').optional(),
  permissions: z.array(z.string().max(60)).max(100),
};

export const createRoleSchema = z.object({ body: z.object(roleFields) });

export const updateRoleSchema = z.object({ body: z.object(roleFields).partial() });

const objectId = z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid ID');
const staffPhone = z
  .string()
  .trim()
  .max(30, 'Phone number too long')
  .regex(/^\+?[\d\s\-()]*$/, 'Enter a valid phone number');

export const createStaffSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Name too long'),
    email: emailField,
    phone: staffPhone.optional(),
    staffRoleId: objectId.nullable().optional(),
  }),
});

export const updateStaffSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Name too long').optional(),
    phone: staffPhone.optional(),
    staffRoleId: objectId.nullable().optional(),
  }),
});

// ── Lawyer assistants (delegations) ───────────────────────────────────────────
// Only lawyer-scoped keys can be delegated; firm-only or unknown keys are a 400.
const delegationPermissions = z
  .array(z.string().max(60))
  .min(1, 'Choose at least one permission')
  .max(LAWYER_SCOPED.size)
  .refine((perms) => perms.every((p) => LAWYER_SCOPED.has(p as Permission)), 'Only permissions for a lawyer\'s own work can be given to an assistant')
  .transform((perms) => [...new Set(perms)]);

export const inviteAssistantSchema = z.object({
  body: z.object({
    email: emailField,
    // Required by the controller only when the email is new to the firm
    name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100, 'Name too long').optional().or(z.literal('')),
    phone: staffPhone.optional(),
    permissions: delegationPermissions,
  }),
});

export const updateDelegationSchema = z.object({ body: z.object({ permissions: delegationPermissions }) });

export const grantDelegationSchema = z.object({
  body: z.object({ lawyerId: objectId, permissions: delegationPermissions }),
});

// ── Photo gallery (admin) ─────────────────────────────────────────────────────
// Images are created by the upload (POST /api/admin/gallery, multipart); these
// cover editing their text, publishing and ordering.
const galleryText = (max: number, label: string) =>
  z.object({
    en: z.string().trim().max(max, `${label} (English) must be at most ${max} characters`).optional(),
    bn: z.string().trim().max(max, `${label} (Bangla) must be at most ${max} characters`).optional(),
  });

const galleryImageParams = z.object({ imageId: objectId });

export const galleryImageIdSchema = z.object({ params: galleryImageParams });

export const updateGalleryImageSchema = z.object({
  params: galleryImageParams,
  body: z
    .object({
      title: galleryText(120, 'Title').optional(),
      description: galleryText(5000, 'Description').optional(),
      isPublished: z.boolean().optional(),
    })
    .refine((b) => b.title !== undefined || b.description !== undefined || b.isPublished !== undefined, 'Nothing to update'),
});

export const reorderGallerySchema = z.object({
  body: z.object({
    order: z
      .array(objectId)
      .min(1, 'order must list at least one image')
      .max(1000)
      .refine((ids) => new Set(ids).size === ids.length, 'order contains duplicate IDs'),
  }),
});

export const formatZodIssues =(error: z.ZodError) =>
  error.issues.map((issue) => ({
    field: issue.path.join('.'),
    message: issue.message,
  }));

export const validateRequest = (schema: z.ZodSchema) => {
  return (req: any, res: any, next: any) => {
    try {
      schema.parse(req);
      next();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: 'Validation failed',
          errors: formatZodIssues(error),
        });
      }
      // Non-Zod error — pass to Express error handler
      next(error);
    }
  };
};
