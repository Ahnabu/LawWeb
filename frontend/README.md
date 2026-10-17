# Islam & Associates - Frontend

The official web portal and client dashboard for **Islam & Associates**, built with Next.js 15 (App Router), React 18, TypeScript, and Tailwind CSS.

---

## 🏛 Features

- **Public Law Firm Portal:**
  - Modern, responsive landing page and firm overview.
  - Practice areas showcase and detailed practice pages.
  - Attorney and associate profiles directory.
  - Legal insights, articles, and blog publishing.
  - Bilingual support (English & Bengali `/bn`).
  - Online consultation and appointment scheduling.
  - Public case tracking lookup.

- **Role-Based Client & Legal Portal:**
  - **Client Dashboard:** Track assigned cases, view scheduled consultations, upload documents, and communicate with counsel.
  - **Lawyer Portal:** Manage active cases, review appointment requests, update hearing dates, and record client notes.
  - **Admin CMS Dashboard:** Publish and manage firm content, lawyers, practice areas, and oversee system users.

- **Authentication & Security:**
  - Secure credential-based authentication with HTTP-only cookies.
  - Password reset and email verification workflows.
  - Route protection and access control via Next.js Middleware.

- **SEO & Performance:**
  - Automated `sitemap.xml` and `robots.txt` generation.
  - Dynamic OpenGraph metadata, canonical URLs, and structured data.
  - On-demand ISR revalidation via `/api/revalidate` when CMS content changes.

---

## 🛠 Tech Stack

- **Framework:** [Next.js 15](https://nextjs.org/) (App Router)
- **Language:** TypeScript
- **UI & Styling:** Tailwind CSS v4, Lucide React icons
- **State & Notifications:** Sonner (Toast notifications)
- **Testing:** Vitest
- **Deployment:** Vercel

---

## 🚀 Getting Started

### 1. Prerequisites

- **Node.js:** v18.18.0 or newer (v20+ recommended)
- **npm** or **yarn** / **pnpm**

### 2. Installation

```bash
# Clone the repository
git clone https://github.com/IslamAssociates/islam-associates-frontend.git
cd islam-associates-frontend

# Install dependencies
npm install
```

### 3. Environment Configuration

Create a `.env.local` file in the root directory by copying `.env.example`:

```bash
cp .env.example .env.local
```

Set the following environment variables:

| Variable | Description | Example |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | Base URL of the backend API (no trailing slash) | `http://localhost:5000` |
| `NEXT_PUBLIC_SITE_URL` | Public URL of the frontend (for SEO & canonicals) | `http://localhost:3000` |
| `REVALIDATE_SECRET` | Secret token matching backend for instant CMS updates | `your-secure-secret` |

### 4. Running Locally

```bash
# Start development server (runs on http://localhost:3000)
npm run dev

# Run unit tests
npm run test

# Build for production
npm run build

# Start production server
npm start
```

---

## 📁 Project Structure

```
frontend/
├── app/                  # Next.js App Router pages and layouts
│   ├── (home)/           # Homepage and landing sections
│   ├── about/            # About firm page
│   ├── appointment/      # Consultation booking form
│   ├── blogs/            # Legal insights & blog listing
│   ├── bn/               # Bengali language localized pages
│   ├── dashboard/        # Role-based dashboards (admin/lawyer/client)
│   ├── lawyers/          # Lawyer directory & profile pages
│   ├── login/            # Authentication: Login
│   ├── register/         # Authentication: Registration
│   ├── practice-areas/   # Legal practice area pages
│   ├── track-case/       # Public case tracker
│   ├── api/revalidate/   # On-demand CMS cache revalidation endpoint
│   ├── layout.tsx        # Root layout with navigation & footer
│   ├── robots.ts         # Dynamic robots.txt
│   └── sitemap.ts        # Dynamic sitemap.xml
├── components/           # Reusable UI and layout components
├── lib/                  # API client, utilities, and helper functions
├── types/                # TypeScript interfaces and type definitions
├── public/               # Static images, assets, and icons
└── vercel.json           # Vercel deployment configuration
```

---

## 🌐 Deployment to Vercel

1. Import the repository into **Vercel**.
2. Configure the environment variables in **Project Settings > Environment Variables**:
   - `NEXT_PUBLIC_API_URL`: URL of your deployed backend (e.g., `https://api.islamandassociates.com`)
   - `NEXT_PUBLIC_SITE_URL`: Frontend domain (e.g., `https://islamandassociates.com`)
   - `REVALIDATE_SECRET`: Match the `REVALIDATE_SECRET` on your backend.
3. Deploy! Next.js will build and serve your application.

---

## 📄 License

This project is licensed under the MIT License.
