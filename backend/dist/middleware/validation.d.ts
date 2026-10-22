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
            contact: "contact";
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
            contact: "contact";
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
            contact: "contact";
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
export declare const contactMessageSchema: z.ZodObject<{
    body: z.ZodObject<{
        name: z.ZodString;
        email: z.ZodString;
        phone: z.ZodOptional<z.ZodString>;
        subject: z.ZodOptional<z.ZodString>;
        message: z.ZodString;
        website: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const auditLogQueryFields: z.ZodObject<{
    page: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
    limit: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
    category: z.ZodPreprocess<z.ZodOptional<z.ZodString>>;
    action: z.ZodPreprocess<z.ZodOptional<z.ZodString>>;
    actorRole: z.ZodPreprocess<z.ZodOptional<z.ZodEnum<{
        admin: "admin";
        lawyer: "lawyer";
        client: "client";
        staff: "staff";
        anonymous: "anonymous";
        system: "system";
    }>>>;
    actor: z.ZodPreprocess<z.ZodOptional<z.ZodString>>;
    onBehalfOf: z.ZodPreprocess<z.ZodOptional<z.ZodString>>;
    search: z.ZodPreprocess<z.ZodOptional<z.ZodString>>;
    from: z.ZodPreprocess<z.ZodOptional<z.ZodCoercedDate<unknown>>>;
    to: z.ZodPreprocess<z.ZodOptional<z.ZodCoercedDate<unknown>>>;
}, z.core.$strip>;
export declare const auditLogListSchema: z.ZodObject<{
    query: z.ZodObject<{
        page: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
        limit: z.ZodOptional<z.ZodCoercedNumber<unknown>>;
        category: z.ZodPreprocess<z.ZodOptional<z.ZodString>>;
        action: z.ZodPreprocess<z.ZodOptional<z.ZodString>>;
        actorRole: z.ZodPreprocess<z.ZodOptional<z.ZodEnum<{
            admin: "admin";
            lawyer: "lawyer";
            client: "client";
            staff: "staff";
            anonymous: "anonymous";
            system: "system";
        }>>>;
        actor: z.ZodPreprocess<z.ZodOptional<z.ZodString>>;
        onBehalfOf: z.ZodPreprocess<z.ZodOptional<z.ZodString>>;
        search: z.ZodPreprocess<z.ZodOptional<z.ZodString>>;
        from: z.ZodPreprocess<z.ZodOptional<z.ZodCoercedDate<unknown>>>;
        to: z.ZodPreprocess<z.ZodOptional<z.ZodCoercedDate<unknown>>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const createRoleSchema: z.ZodObject<{
    body: z.ZodObject<{
        name: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        permissions: z.ZodArray<z.ZodString>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const updateRoleSchema: z.ZodObject<{
    body: z.ZodObject<{
        name: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodOptional<z.ZodString>>;
        permissions: z.ZodOptional<z.ZodArray<z.ZodString>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const createStaffSchema: z.ZodObject<{
    body: z.ZodObject<{
        name: z.ZodString;
        email: z.ZodString;
        phone: z.ZodOptional<z.ZodString>;
        staffRoleId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const updateStaffSchema: z.ZodObject<{
    body: z.ZodObject<{
        name: z.ZodOptional<z.ZodString>;
        phone: z.ZodOptional<z.ZodString>;
        staffRoleId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const inviteAssistantSchema: z.ZodObject<{
    body: z.ZodObject<{
        email: z.ZodString;
        name: z.ZodUnion<[z.ZodOptional<z.ZodString>, z.ZodLiteral<"">]>;
        phone: z.ZodOptional<z.ZodString>;
        permissions: z.ZodPipe<z.ZodArray<z.ZodString>, z.ZodTransform<string[], string[]>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const updateDelegationSchema: z.ZodObject<{
    body: z.ZodObject<{
        permissions: z.ZodPipe<z.ZodArray<z.ZodString>, z.ZodTransform<string[], string[]>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const grantDelegationSchema: z.ZodObject<{
    body: z.ZodObject<{
        lawyerId: z.ZodString;
        permissions: z.ZodPipe<z.ZodArray<z.ZodString>, z.ZodTransform<string[], string[]>>;
    }, z.core.$strip>;
}, z.core.$strip>;
export declare const formatZodIssues: (error: z.ZodError) => {
    field: string;
    message: string;
}[];
export declare const validateRequest: (schema: z.ZodSchema) => (req: any, res: any, next: any) => any;
//# sourceMappingURL=validation.d.ts.map