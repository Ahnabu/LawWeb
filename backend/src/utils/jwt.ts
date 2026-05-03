import jwt from 'jsonwebtoken';
import { IUser } from '../models/User';

interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

export const generateAccessToken = (user: IUser): string => {
  const payload: TokenPayload = {
    userId: user._id.toString(),
    email: user.email,
    role: user.role,
  };

  return jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: '15m', // Short-lived access token
    issuer: 'lawweb-backend',
    audience: 'lawweb-client',
  });
};

export const generateRefreshToken = (user: IUser): string => {
  const payload: TokenPayload = {
    userId: user._id.toString(),
    email: user.email,
    role: user.role,
  };

  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, {
    expiresIn: '7d', // Longer-lived refresh token
    issuer: 'lawweb-backend',
    audience: 'lawweb-client',
  });
};

export const verifyAccessToken = (token: string): TokenPayload => {
  return jwt.verify(token, process.env.JWT_SECRET!, {
    issuer: 'lawweb-backend',
    audience: 'lawweb-client',
  }) as TokenPayload;
};

export const verifyRefreshToken = (token: string): TokenPayload => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET!, {
    issuer: 'lawweb-backend',
    audience: 'lawweb-client',
  }) as TokenPayload;
};
