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
   - `RESEND_API_KEY=<your-resend-api-key>`
   - `RESEND_FROM_EMAIL=<verified-sender@your-domain.com>`
   - `RESEND_TEST_EMAIL=<your-verified-test-email>`
   - `JWT_SECRET=<random-long-secret>`
   - `JWT_REFRESH_SECRET=<random-long-secret>`
   - `COOKIE_DOMAIN=<your-cookie-domain>`

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

#### Backend (.env file)
- `PORT`: Server port (default: 5000)
- `NODE_ENV`: Environment mode (development/production)
- `CLIENT_URL`: Frontend URL(s) for CORS (comma-separated for multiple origins)
- `MONGODB_URI`: MongoDB connection string
- `JWT_SECRET`: Secret key for JWT signing
- `JWT_REFRESH_SECRET`: Secret key for refresh tokens
- `COOKIE_DOMAIN`: Cookie domain for credentials

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
     - Try removing the `https://` prefix in `CLIENT_URL` if having issues

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
| Cookies not persisting | Verify `credentials: 'include'` is set in fetch requests (already configured) |
| 404 on health check | Ensure backend is deployed and running |

