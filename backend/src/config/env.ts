import dotenv from 'dotenv';
dotenv.config();

const isProduction = () => process.env.NODE_ENV === 'production';

// Called once by server.ts. Fails fast instead of signing tokens with "undefined".
export const assertServerEnv = () => {
  const missing = ['MONGODB_URI', 'JWT_SECRET', 'JWT_REFRESH_SECRET'].filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  if (process.env.JWT_SECRET === process.env.JWT_REFRESH_SECRET) {
    throw new Error('JWT_SECRET and JWT_REFRESH_SECRET must be different values.');
  }

  if (isProduction()) {
    const weak = ['JWT_SECRET', 'JWT_REFRESH_SECRET'].filter((key) => (process.env[key] as string).length < 32);
    if (weak.length) {
      throw new Error(`${weak.join(', ')} must be at least 32 characters in production.`);
    }
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is required in production (verification and password reset emails).');
    }
    if (!getFrontendUrl()) {
      throw new Error('FRONTEND_URL (or CLIENT_URL) is required in production to build email links.');
    }
  }
};

// Public site origin used to build links inside emails (password reset, lawyer invite).
export const getFrontendUrl = () => {
  const explicit = process.env.FRONTEND_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, '');

  const firstClient = process.env.CLIENT_URL?.split(',')[0]?.trim();
  if (firstClient) return firstClient.replace(/\/+$/, '');

  return isProduction() ? '' : 'http://localhost:3000';
};
