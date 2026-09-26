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
import { requireTrustedOrigin, sanitizeInput } from "./middleware/security";

// Use Google public DNS so mongodb+srv SRV lookups resolve reliably
dns.setServers(["8.8.8.8", "8.8.4.4"]);

assertServerEnv();

const app = express();
const PORT = process.env.PORT || 5000;

// Behind Render/Railway/Nginx the client IP is in X-Forwarded-For. Without this
// every visitor shares the proxy's IP and one abuser rate-limits everyone.
// TRUST_PROXY = number of proxy hops (1 on Render/Railway/Heroku).
if (process.env.TRUST_PROXY) {
  const hops = Number(process.env.TRUST_PROXY);
  app.set("trust proxy", Number.isNaN(hops) ? process.env.TRUST_PROXY : hops);
}
app.disable("x-powered-by");

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
const allowedOrigins = [
  ...(process.env.NODE_ENV === "production" ? [] : ["http://localhost:3000", "http://127.0.0.1:3000"]),
  "https://law-web-five.vercel.app",
  ...clientUrls,
];

app.use(
  cors({
    origin: allowedOrigins,
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

// Connect to MongoDB Atlas
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI!, {
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 45000,
    });
    console.log("MongoDB Atlas connected successfully");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    console.log("Retrying MongoDB connection in 5 seconds...");
    setTimeout(connectDB, 5000);
  }
};

connectDB();

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/consultations", consultationRoutes);
app.use("/api/lawyers", lawyerRoutes);
app.use("/api/cases", caseRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/users", userRoutes);
app.use("/api/blogs", blogRoutes);
app.use("/api/content", contentRoutes);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

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

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
});
