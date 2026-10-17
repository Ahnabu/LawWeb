# Islam & Associates - Backend API

The RESTful backend service for **Islam & Associates**, built with Node.js, Express, TypeScript, and MongoDB.

---

## 🏛 Features

- **Authentication & Authorization:**
  - Secure JWT authentication with HTTP-only cookies and refresh token rotation.
  - Role-Based Access Control (`client`, `lawyer`, `admin`).
  - Account verification, password reset flows, and lawyer onboarding invitations.

- **Case Management:**
  - Case creation, status tracking, stage transitions, and case notes.
  - Lawyer-to-case assignments and client associations.
  - Case tracking endpoint for client status queries.

- **Consultations & Appointments:**
  - Online legal consultation booking workflow.
  - Scheduling, status updates (pending, confirmed, completed, cancelled), and lawyer assignment.

- **CMS & Content Management:**
  - Manage practice areas, attorney bios, blog articles, and firm information.
  - Instant on-demand frontend cache revalidation via webhook upon publishing.

- **File Uploads & Media Storage:**
  - Integrated with Cloudinary via Multer for case documents, attorney portraits, and blog media.

- **Transactional Emails:**
  - Email notifications powered by Resend for verification codes, password resets, and appointment updates.

- **Enterprise Security:**
  - Helmet for secure HTTP headers.
  - Express Rate Limiting to prevent brute-force attacks.
  - HPP (HTTP Parameter Pollution prevention).
  - CSRF origin checking and configurable multi-origin CORS.
  - Flexible deployment options: Standard Node.js server or Vercel Serverless Function.

---

## 🛠 Tech Stack

- **Runtime:** Node.js (v18+)
- **Language:** TypeScript
- **Framework:** Express.js 4
- **Database:** MongoDB via Mongoose
- **Authentication:** JSON Web Tokens (`jsonwebtoken`), `bcryptjs`
- **File Storage:** Cloudinary & Multer
- **Email Delivery:** Resend
- **Validation:** Zod

---

## 🚀 Getting Started

### 1. Prerequisites

- **Node.js:** v18.18.0 or newer
- **MongoDB:** Local MongoDB instance or MongoDB Atlas cluster URI
- **Cloudinary Account:** For media uploads
- **Resend Account:** For transactional email sending

### 2. Installation

```bash
# Clone the repository
git clone https://github.com/IslamAssociates/islam-associates-backend.git
cd islam-associates-backend

# Install dependencies
npm install
```

### 3. Environment Configuration

Create a `.env` file in the root directory by copying `.env.example`:

```bash
cp .env.example .env
```

Configure your environment variables:

```ini
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>/<db>

# Frontend origin(s) allowed by CORS (comma-separated for multiple)
CLIENT_URL=http://localhost:3000
FRONTEND_URL=http://localhost:3000
ALLOW_VERCEL_PREVIEWS=false

# JWT Secret Keys (Generate with: node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")
JWT_SECRET=your_32_plus_char_secret_key
JWT_REFRESH_SECRET=your_different_32_plus_char_secret_key

# Cookie Configuration
COOKIE_SAMESITE=none
COOKIE_DOMAIN=

# Email (Resend)
RESEND_API_KEY=re_your_api_key
RESEND_FROM_EMAIL=LawWeb <onboarding@resend.dev>

# Cloudinary Storage
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# On-Demand Revalidation (matches frontend REVALIDATE_SECRET)
FRONTEND_REVALIDATE_URL=http://localhost:3000/api/revalidate
REVALIDATE_SECRET=your_revalidation_secret

# Initial Admin Seeding
SEED_ADMIN_EMAIL=admin@example.com
SEED_ADMIN_PASSWORD=your_secure_password
SEED_ADMIN_NAME=Admin
```

### 4. Database Seeding

To create the initial admin user account:

```bash
npm run seed:admin
```

### 5. Running the Application

```bash
# Start development server with live reload
npm run dev

# Compile TypeScript to dist/
npm run build

# Start production server
npm start
```

---

## 📡 API Overview

| Prefix | Description | Auth Required |
| :--- | :--- | :--- |
| `/api/auth` | User registration, login, logout, refresh tokens, password reset | No / Cookie |
| `/api/users` | Profile retrieval, password updates | Yes |
| `/api/cases` | Case tracking, case CRUD, hearing date scheduling | Role-based |
| `/api/consultations` | Appointment requests, lawyer assignment, status workflow | Role-based |
| `/api/lawyers` | Lawyer directory listing, public profiles | Public / Admin |
| `/api/blogs` | Legal articles, publishing, categorization | Public / Admin |
| `/api/content` | Practice areas and static CMS firm content | Public / Admin |
| `/api/admin` | User management, system metrics, administrative oversight | Admin |
| `/api/health` | Service uptime and health check | Public |

---

## 🌐 Deployment

### Option A: Vercel Serverless (Recommended for all-in-one Vercel)
The project includes `vercel.json` and `api/index.ts` pre-configured to run Express as serverless endpoints.
1. Connect this repository to Vercel.
2. In Project Settings, set Framework to **Other**.
3. Add the production environment variables in the Vercel Dashboard.
4. Deploy and verify health check at `https://your-api.vercel.app/api/health`.

### Option B: Cloud Container / VM (Render, Railway, DigitalOcean, VPS)
1. Set `NODE_ENV=production` and `TRUST_PROXY=1`.
2. Build command: `npm run build`
3. Start command: `npm start`
4. Ensure `CLIENT_URL` and `FRONTEND_URL` match your live frontend domain.

---

## 📄 License

This project is licensed under the MIT License.
