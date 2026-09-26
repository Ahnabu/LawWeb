import { Request, Response, NextFunction } from 'express';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// Auth cookies are SameSite=None (frontend and API live on different sites), so
// the browser attaches them to cross-site form posts too. CORS does not stop a
// "simple" POST from being sent, so state-changing requests must come from one
// of our own origins. Browsers always send Origin on cross-origin POST/PUT/
// PATCH/DELETE; requests without Origin or Referer are non-browser clients.
export const requireTrustedOrigin = (allowedOrigins: string[]) => {
  const allowed = new Set(allowedOrigins.map((origin) => origin.trim().replace(/\/+$/, '')));

  return (req: Request, res: Response, next: NextFunction) => {
    if (SAFE_METHODS.has(req.method)) return next();

    let origin = req.get('origin');
    if (!origin) {
      const referer = req.get('referer');
      if (referer) {
        try {
          origin = new URL(referer).origin;
        } catch {
          origin = 'invalid';
        }
      }
    }

    if (origin && !allowed.has(origin)) {
      return res.status(403).json({ message: 'Request origin not allowed' });
    }

    next();
  };
};

// Strips MongoDB operator keys ("$gt", "$where", "a.b") from user input so a
// body like { "email": { "$ne": null } } cannot turn into a query operator.
const stripOperators = (value: unknown, depth = 0): unknown => {
  if (depth > 20 || value === null || typeof value !== 'object') return value;

  if (Array.isArray(value)) {
    return value.map((item) => stripOperators(item, depth + 1));
  }

  const clean: Record<string, unknown> = {};
  for (const [key, inner] of Object.entries(value as Record<string, unknown>)) {
    if (key.startsWith('$') || key.includes('.') || key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
    clean[key] = stripOperators(inner, depth + 1);
  }
  return clean;
};

export const sanitizeInput = (req: Request, _res: Response, next: NextFunction) => {
  if (req.body && typeof req.body === 'object') req.body = stripOperators(req.body);
  if (req.params) req.params = stripOperators(req.params) as Request['params'];
  if (req.query) {
    // Express 4 lets us replace req.query; mutate in place to stay compatible with 5
    const cleaned = stripOperators(req.query) as Record<string, unknown>;
    for (const key of Object.keys(req.query)) delete (req.query as Record<string, unknown>)[key];
    Object.assign(req.query, cleaned);
  }
  next();
};
