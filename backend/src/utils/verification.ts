import crypto from 'crypto';

export const generateVerificationCode = () => crypto.randomInt(100000, 1000000).toString();

export const hashVerificationCode = (code: string) => crypto.createHash('sha256').update(code).digest('hex');