import { assertServerEnv } from "./config/env"; // Must be first — loads .env before any other module reads process.env
import dns from "dns";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import hpp from "hpp";

// Routes
import authRoutes from "./routes/auth";
import consultationRoutes from "./routes/consultations";
import lawyerRoutes from "./routes/lawyers";
import caseRoutes from "./routes/cases";
import adminRoutes from "./routes/admin";
import userRoutes from "./routes/users";
import blogRoutes from "./routes/blogs";
import contentRoutes from "./routes/content";
import contactRoutes from "./routes/contact";
import accessRoutes from "./routes/access";
import workspaceRoutes from "./routes/workspace";
import { requireTrustedOrigin, sanitizeInput } from "./middleware/security";

// Use Google public DNS so mongodb+srv SRV lookups resolve reliably in local/cloud environments
try {
  dns.setServers(["8.8.8.8", "8.8.4.4"]);
} catch {
  // Ignore in sandboxed serverless environments
}

assertServerEnv();

const app = express();
const PORT = process.env.PORT || 5000;

// Behind Render/Railway/Vercel/Nginx the client IP is in X-Forwarded-For.
if (process.env.TRUST_PROXY) {
  const hops = Number(process.env.TRUST_PROXY);
  app.set("trust proxy", Number.isNaN(hops) ? process.env.TRUST_PROXY : hops);
} else if (process.env.VERCEL) {
  // Vercel Serverless runs behind reverse proxy; trust 1 hop by default
  app.set("trust proxy", 1);
}
app.disable("x-powered-by");

// Request analytics & latency tracking middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === "production" || process.env.VERCEL) {
      console.log(`[API Analytics] ${req.method} ${req.originalUrl || req.url} - ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// Security middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  }),
);

// CORS configuration for both development and production
const clientUrls = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(",").map((url) => url.trim().replace(/\/+$/, "")).filter(Boolean)
  : [];
const frontendUrl = process.env.FRONTEND_URL?.trim().replace(/\/+$/, "");

const allowedOrigins = [
  ...(process.env.NODE_ENV === "production" ? [] : ["http://localhost:3000", "http://127.0.0.1:3000"]),
  "https://law-web-five.vercel.app",
  ...(frontendUrl && !clientUrls.includes(frontendUrl) ? [frontendUrl] : []),
  ...clientUrls,
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const cleanOrigin = origin.trim().replace(/\/+$/, "");
      if (allowedOrigins.includes(cleanOrigin)) return callback(null, true);

      // Support Vercel preview branch deployments if configured
      if (process.env.ALLOW_VERCEL_PREVIEWS === "true" && cleanOrigin.endsWith(".vercel.app")) {
        return callback(null, true);
      }

      // Allow localhost in non-production environments
      if (process.env.NODE_ENV !== "production" && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(cleanOrigin)) {
        return callback(null, true);
      }

      return callback(null, false);
    },
    credentials: true,
  }),
);

app.use(compression());
app.use(cookieParser());
app.use(hpp()); // Prevent HTTP Parameter Pollution
app.use("/api", requireTrustedOrigin(allowedOrigins)); // CSRF protection for cookie auth

// Rate limiting (production only)
if (process.env.NODE_ENV === "production") {
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 300, // dashboards fire several requests per page
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { message: "Too many requests from this IP, please try again later." },
  });
  app.use("/api/", limiter);

  // Credential and code guessing
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { message: "Too many authentication attempts, please try again later." },
  });
  ["/api/auth/login", "/api/auth/register", "/api/auth/verify-email", "/api/auth/reset-password", "/api/auth/change-password"].forEach(
    (path) => app.use(path, authLimiter),
  );

  // Endpoints that send email: protects inboxes and the Resend quota
  const emailLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 10,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { message: "Too many email requests, please try again later." },
  });
  ["/api/auth/forgot-password", "/api/auth/resend-verification-code"].forEach((path) => app.use(path, emailLimiter));

  // Public Contact page form: stops message floods from one IP
  app.use(
    "/api/contact",
    rateLimit({
      windowMs: 60 * 60 * 1000,
      max: 5,
      standardHeaders: "draft-7",
      legacyHeaders: false,
      message: { message: "Too many messages sent. Please try again later or call us." },
    }),
  );

  // Public case lookup (case number + email)
  app.use(
    "/api/cases/track",
    rateLimit({ windowMs: 15 * 60 * 1000, max: 30, standardHeaders: "draft-7", legacyHeaders: false }),
  );
}

// File uploads go through multer, so JSON bodies stay small
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false, limit: "100kb" }));
app.use(sanitizeInput);

// MongoDB Atlas Connection with Serverless Connection Pooling/Caching
let dbPromise: Promise<typeof mongoose> | null = null;

export const connectDB = async () => {
  if (mongoose.connection.readyState === 1) {
    return;
  }

  if (mongoose.connection.readyState === 2 && dbPromise) {
    await dbPromise;
    return;
  }

  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI environment variable is missing");
  }

  try {
    dbPromise = mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 15000,
      connectTimeoutMS: 15000,
      socketTimeoutMS: 45000,
    });
    await dbPromise;
    console.log("MongoDB Atlas connected successfully");
  } catch (error) {
    dbPromise = null;
    console.error("MongoDB connection error:", error);
    if (!process.env.VERCEL) {
      console.log("Retrying MongoDB connection in 5 seconds...");
      setTimeout(connectDB, 5000);
    }
    throw error;
  }
};

// Initial connection attempt on boot
connectDB().catch((err) => {
  if (process.env.VERCEL) {
    console.error("Initial serverless MongoDB connect error:", err);
  }
});

// Middleware to ensure DB connection before handling requests (crucial for Vercel serverless cold starts)
app.use(async (req, res, next) => {
  if (req.path === "/" || req.path === "/api/health") {
    return next();
  }
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error("Database connection failed on request:", err);
    res.status(503).json({ message: "Service temporarily unavailable: database connection error" });
  }
});

// Root & Health check
app.get("/", (_req, res) => {
  res.json({
    status: "OK",
    name: "Islam & Associates International API",
    database: mongoose.connection.readyState === 1 ? "connected" : "connecting/disconnected",
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/health", (_req, res) => {
  res.json({
    status: "OK",
    database: mongoose.connection.readyState === 1 ? "connected" : "connecting/disconnected",
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/consultations", consultationRoutes);
app.use("/api/lawyers", lawyerRoutes);
app.use("/api/cases", caseRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/users", userRoutes);
app.use("/api/blogs", blogRoutes);
app.use("/api/content", contentRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/access", accessRoutes);
app.use("/api/workspace/:lawyerId", workspaceRoutes);

// Error handling middleware
app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    console.error(err.stack);
    res.status(500).json({ message: "Something went wrong!" });
    next();
  },
);

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// In standalone server (e.g. Render, Railway, VPS, Local dev), listen on PORT.
// On Vercel (serverless environment), Vercel invokes the exported app directly.
if (process.env.NODE_ENV !== "test" && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
  });
}

export default app;
export { app };
