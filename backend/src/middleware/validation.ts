import { z } from 'zod';
import { CONTENT_PAGE_KEYS } from '../config/contentSchemas';

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

export const formatZodIssues = (error: z.ZodError) =>
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
