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

### For Backend Deployment

The backend can be deployed directly to **Vercel as a Serverless API** (recommended for an all-Vercel stack) or to cloud platforms like Render, Railway, or a VPS.

#### Option A: Deploy Backend to Vercel (All-in-one Vercel)
1. In Vercel, click **Add New...** → **Project** → select the `LawWeb` repository.
2. Set **Root Directory** to `backend`.
3. Set **Framework Preset** to `Other`.
4. The backend already includes `backend/vercel.json` and `backend/api/index.ts` to route all endpoints into Express serverless functions.
5. Add the required environment variables (see below).
6. Click **Deploy**. Test via `https://your-backend.vercel.app/api/health`.

#### Option B: Deploy Backend to Render, Railway, or Heroku
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

## Role-based access (staff, roles, lawyer assistants)

Staff accounts, custom roles and lawyer assistants (design and history: `docs/rbac/`; guide for
the firm: `docs/rbac/user-guide.md`).

**Environment variables:** none new. `RBAC_DEMO_PASSWORD` is read only by the development seed
script below.

**Data:** no migration. Existing accounts keep their type; the existing admin is the super-admin.

**Indexes:** `Role.nameKey` (unique), `StaffAssignment {staffId, lawyerId}` (unique) plus
`staffId` and `lawyerId`, `User.staffRoleId`, `AuditLog {onBehalfOf, createdAt}`. Mongoose builds
them on start-up, but on Vercel that happens lazily per cold start, so build them once:

```bash
cd backend
MONGODB_URI="<production URI>" npm run sync:indexes
```

It only adds missing indexes (it never drops one) and is safe to run again.

### Rollout

1. **Deploy the backend and the frontend together.** The backend no longer has the endpoints the
   pre-assistant frontend used (`/api/lawyers/me/availability`, `/api/lawyers/me/profile`,
   `/api/lawyers/me/profile/image`, the lawyer view of `/api/cases/my-cases` and
   `/api/consultations/my-consultations`, and `/api/admin/blogs*`). An older frontend talking to
   this backend shows errors on the lawyer dashboard. The new frontend needs the new backend.
2. Run `npm run sync:indexes` against production (above).
3. **Smoke test in production:**
   - The super-admin signs in and sees Team and Roles in the sidebar.
   - A lawyer and a client sign in; their dashboards look as before (the lawyer also has My Team).
   - Create a test staff account with an email the team controls, give it a role, sign in with the
     setup link, check the sidebar, then delete the account from Team.

**Rollback:** roll back both apps together, to the same earlier release. Rolling back only the
backend breaks staff logins and the lawyer dashboard; rolling back only the frontend breaks the
lawyer dashboard (see step 1).

### Development and end-to-end tests

- `npm run seed:rbac-demo` (backend) creates a demo lawyer, client and assistant
  (`rbac-demo-*@example.com`, password `RBAC_DEMO_PASSWORD` or `Demo@12345`), a demo case and an
  unconfirmed booking. `-- --clean` removes them. It refuses to run with `NODE_ENV=production`.
- `frontend/e2e/rbac.spec.ts` runs the role-based access flows against the dev stack:
  `E2E_ADMIN_EMAIL=... E2E_ADMIN_PASSWORD=... npx playwright test e2e/rbac.spec.ts` (frontend).
  It runs the seed itself, so the backend `.env` must point at a development database.
- In development every email goes to `RESEND_TEST_EMAIL`. With Resend's test sender that address
  must be the Resend account owner's, or setup and assistant emails fail (accounts are still
  created; the UI shows a warning).

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
| A staff member says a page shows "You don't have access" | Their role (Team → their name) or the lawyer's assistant settings don't include that area; changes apply on their next click |
| Lawyer dashboard shows errors right after a deploy | The frontend and backend are from different releases; deploy both (see Role-based access) |

