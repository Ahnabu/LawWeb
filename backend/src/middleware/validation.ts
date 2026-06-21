import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name too long'),
    email: z.string().email('Invalid email format'),
    password: z.string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
        'Password must contain uppercase, lowercase, number and special character'),
    role: z.enum(['lawyer', 'client']).default('client'),
    barId: z.string().optional(),
    phone: z.string().regex(/^(\+?8801[3-9]\d{8}|01[3-9]\d{8})$/, 'Enter a valid Bangladeshi phone number, such as +8801XXXXXXXXX'),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Password is required'),
  }),
});

export const validateRequest = (schema: z.ZodSchema) => {
  return (req: any, res: any, next: any) => {
    try {
      schema.parse(req);
      next();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: 'Validation failed',
          errors: error.issues.map((issue: any) => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        });
      }
      // Non-Zod error — pass to Express error handler
      next(error);
    }
  };
};
