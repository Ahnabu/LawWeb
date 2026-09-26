# Deployment Guide: LawWeb Frontend & Backend

## Issues Fixed from React to Next.js Migration

This document addresses the critical connectivity issues that occurred during the migration from React to Next.js and provides deployment instructions for Vercel.

### Issues Fixed:

1. **API URL Hardcoded to localhost** - The API base URL was defaulting to `http://localhost:5000` even in production, causing connection timeouts
2. **Middleware Configuration Duplication** - Middleware was redefining API_BASE_URL instead of importing from centralized config
3. **CORS Environment Variable Mismatch** - Backend was looking for `FRONTEND_URL` but `.env` had `CLIENT_URL`
4. **CORS Not Configured for Production** - No support for multiple frontend origins in production

### Changes Made:

#### Frontend (`frontend/lib/api.ts`)
- Added production warning if `NEXT_PUBLIC_API_URL` is not configured
- Ensures developers are aware of missing configuration

#### Frontend (`frontend/middleware.ts`)
- Now imports `API_BASE_URL` from `lib/api` instead of redefining it
- Eliminates configuration duplication

#### Backend (`backend/src/server.ts`)
- Updated CORS to support multiple origins
- Handles both development and production environments
- Uses `CLIENT_URL` environment variable with comma-separated origins for production

---

## Deployment Instructions

### For Vercel Frontend Deployment

1. **Connect your repository to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project" and select your GitHub repository

2. **Set Environment Variables in Vercel Dashboard**
   - Go to Project Settings → Environment Variables
   - Add the following:
     ```
     NEXT_PUBLIC_API_URL=https://your-backend-url.com
     REVALIDATE_SECRET=<random-long-secret, same value as on the backend>
     NEXT_PUBLIC_SITE_URL=https://your-domain.com
     ```
   - Replace `https://your-backend-url.com` with your actual backend URL (e.g., Render, Railway, etc.)

3. **Deploy**
   - Vercel will automatically build and deploy your Next.js application
   - Your application will have a URL like `law-web-xxx.vercel.app`

### For Backend Deployment (Example: Render, Railway, Heroku)

1. **Configure Environment Variables on Your Hosting Platform**
   Use [backend/.env.example](backend/.env.example) as the template in your hosting dashboard. Do not paste real secrets into docs or commits.

   Required variables:
   - `PORT=5000`
   - `NODE_ENV=production`
   - `CLIENT_URL=https://your-frontend-domain.com`
   - `MONGODB_URI=<your-mongodb-connection-string>`
   - `FRONTEND_URL=https://your-frontend-domain.com` (origin used in password-reset emails)
   - `RESEND_API_KEY=<your-resend-api-key>`
   - `RESEND_FROM_EMAIL=<verified-sender@your-domain.com>`
   - `JWT_SECRET=<random secret, 32+ chars>`
   - `JWT_REFRESH_SECRET=<different random secret, 32+ chars>`
   - `TRUST_PROXY=1` (Render/Railway/Heroku)
   - `COOKIE_SAMESITE` / `COOKIE_DOMAIN`: see [docs/auth-production.md](docs/auth-production.md#cross-site-cookies-recommended-upgrade)

   Auth, email (Resend domain setup) and the one-off password migration are covered in
   [docs/auth-production.md](docs/auth-production.md). The server refuses to start in production
   when the JWT secrets or `RESEND_API_KEY` are missing.

   Optional (CMS instant publish, see below):
   - `FRONTEND_REVALIDATE_URL=https://your-frontend-domain.com/api/revalidate`
   - `REVALIDATE_SECRET=<random-long-secret, same value as on the frontend>`

   For local development, keep the values in your private `.env` file only.

2. **For Multiple Frontend Origins (if needed)**
   - Set `CLIENT_URL` to comma-separated values:
   ```
   CLIENT_URL=https://law-web-xxx.vercel.app,https://your-custom-domain.com
   ```

3. **Deploy Backend**
   - Push your code and your hosting platform will automatically deploy

### Environment Variables Summary

#### Frontend (.env.local for development, Vercel for production)
- `NEXT_PUBLIC_API_URL`: URL of your backend API (e.g., `https://backend-url.com`)
- `REVALIDATE_SECRET`: Shared secret the backend sends to `/api/revalidate` after a CMS publish
- `NEXT_PUBLIC_SITE_URL`: Public address of the site (e.g., `https://your-domain.com`, no trailing slash). Used for canonical/`hreflang` links, `sitemap.xml` and `robots.txt`. Falls back to the Vercel production domain, then `http://localhost:3000`.

#### Backend (.env file)
- `PORT`: Server port (default: 5000)
- `NODE_ENV`: Environment mode (development/production)
- `CLIENT_URL`: Frontend URL(s) for CORS (comma-separated for multiple origins)
- `MONGODB_URI`: MongoDB connection string
- `FRONTEND_URL`: Origin used in email links (defaults to the first `CLIENT_URL`)
- `JWT_SECRET`: Secret key for access tokens (32+ chars in production)
- `JWT_REFRESH_SECRET`: Different secret for refresh tokens (32+ chars in production)
- `RESEND_API_KEY` / `RESEND_FROM_EMAIL`: Email delivery; `RESEND_TEST_EMAIL` is development only
- `TRUST_PROXY`: Proxy hops in front of Express (`1` on Render/Railway/Heroku)
- `COOKIE_SAMESITE` (optional): `none` (default, cross-site) or `lax` (same-site deployment)
- `COOKIE_DOMAIN` (optional): Production only, for a shared parent domain
- `FRONTEND_REVALIDATE_URL` (optional): `https://<frontend>/api/revalidate`
- `REVALIDATE_SECRET` (optional): Same value as the frontend's

#### CMS content and caching
Public pages read published CMS content on the server and cache it for 5 minutes. When both
`FRONTEND_REVALIDATE_URL` and `REVALIDATE_SECRET` are set, publishing in the admin dashboard
refreshes the site immediately. Without them, a publish shows up within 5 minutes.

If the backend is unreachable during a frontend build, pages are built with the default text
and pick up the published content within 5 minutes of the deploy.

---

## Testing the Connection

1. **Check Backend Health**
   - Visit `https://your-backend-url.com/api/health`
   - Should return: `{"status":"OK","timestamp":"..."}`

2. **Check Frontend**
   - Visit your Vercel frontend URL
   - Open DevTools → Network tab
   - Attempt to login
   - Check if API requests go to the correct backend URL

3. **Debug Connection Issues**
   - If you see "ERR_CONNECTION_TIMED_OUT", check:
     - Is `NEXT_PUBLIC_API_URL` set in Vercel?
     - Is the backend URL correct?
     - Is the backend running?
   - If you see CORS errors, check:
     - Is `CLIENT_URL` set correctly in backend?
     - Does it match your Vercel frontend URL?
     - Each entry needs the scheme and no trailing slash (`https://app.example.com`)

---

## Next.js Migration Checklist

- ✅ API configuration centralized in `lib/api.ts`
- ✅ Middleware properly configured for authentication
- ✅ 'use client' directive added to client components
- ✅ Server-side rendering compatible with fetch API
- ✅ Cookie handling configured for credentials
- ✅ Environment variables properly structured for Next.js

---

## Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| Frontend can't reach backend | Verify `NEXT_PUBLIC_API_URL` is set in Vercel environment variables |
| CORS errors | Check that `CLIENT_URL` on backend matches frontend URL exactly |
| Login fails | Clear cookies and try again; check network tab for actual error |
| `403 Request origin not allowed` on POST/PUT/DELETE | The page's origin is missing from `CLIENT_URL` (CSRF check) |
| Users logged out often on iPhone/Safari | Cross-site cookies are being blocked; serve the API from a subdomain of the site (see docs/auth-production.md) |
| Cookies not persisting | Verify `credentials: 'include'` is set in fetch requests (already configured) |
| 404 on health check | Ensure backend is deployed and running |
| Published CMS content takes ~5 min to appear | Set `FRONTEND_REVALIDATE_URL` + `REVALIDATE_SECRET` on the backend and the same `REVALIDATE_SECRET` on the frontend; check backend logs for `Content revalidation failed` |
| Canonical / `hreflang` / sitemap URLs point to the wrong domain | Set `NEXT_PUBLIC_SITE_URL` in Vercel and redeploy (it is read at build time) |

