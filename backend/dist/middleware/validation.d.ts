import { z } from 'zod';
export declare const passwordSchema: z.ZodString;
export declare const registerSchema: z.ZodObject<{
    body: z.ZodObject<{
        name: z.ZodString;
        email: z.ZodString;
        password: z.ZodString;
        role: z.ZodDefault<z.ZodEnum<{
            lawyer: "lawyer";
            client: "client";
        }>>;
        barId: z.ZodOptional<z.ZodString>;
        phone: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const loginSchema: z.ZodObject<{
    body: z.ZodObject<{
        email: z.ZodString;
        password: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const emailOnlySchema: z.ZodObject<{
    body: z.ZodObject<{
        email: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const verifyEmailSchema: z.ZodObject<{
    body: z.ZodObject<{
        email: z.ZodString;
        code: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const resetPasswordSchema: z.ZodObject<{
    body: z.ZodObject<{
        token: z.ZodString;
        password: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const changePasswordSchema: z.ZodObject<{
    body: z.ZodObject<{
        currentPassword: z.ZodString;
        newPassword: z.ZodString;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const contentPageSchema: z.ZodObject<{
    params: z.ZodObject<{
        pageKey: z.ZodEnum<{
            global: "global";
            site: "site";
            home: "home";
            about: "about";
            "practice-areas": "practice-areas";
            "track-case": "track-case";
            blogs: "blogs";
        }>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const saveContentDraftSchema: z.ZodObject<{
    params: z.ZodObject<{
        pageKey: z.ZodEnum<{
            global: "global";
            site: "site";
            home: "home";
            about: "about";
            "practice-areas": "practice-areas";
            "track-case": "track-case";
            blogs: "blogs";
        }>;
    }, z.core.$strip>;
    body: z.ZodObject<{
        data: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const contentRevisionSchema: z.ZodObject<{
    params: z.ZodObject<{
        pageKey: z.ZodEnum<{
            global: "global";
            site: "site";
            home: "home";
            about: "about";
            "practice-areas": "practice-areas";
            "track-case": "track-case";
            blogs: "blogs";
        }>;
        version: z.ZodCoercedNumber<unknown>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const formatZodIssues: (error: z.ZodError) => {
    field: string;
    message: string;
}[];
export declare const validateRequest: (schema: z.ZodSchema) => (req: any, res: any, next: any) => any;
//# sourceMappingURL=validation.d.ts.map