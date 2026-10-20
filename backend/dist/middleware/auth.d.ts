import { Response, NextFunction } from 'express';
import type { AuthedRequest } from '../access/types';
export declare const AUTH_USER_FIELDS = "name email role staffRoleId barId phone specialization profileImageUrl isVerified passwordNeedsChange tokenVersion isBlocked";
export declare const ACCOUNT_BLOCKED_MESSAGE = "Your account has been blocked. Contact the firm for help.";
export declare const authenticateToken: (req: AuthedRequest, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
//# sourceMappingURL=auth.d.ts.map