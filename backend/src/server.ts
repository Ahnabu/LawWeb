import "./config/env"; // Must be first — loads .env before any other module reads process.env
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
import { resendVerificationCode } from "./controllers/authController";

const app = express();
const PORT = process.env.PORT || 5000;

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
const allowedOrigins = (
  process.env.NODE_ENV === "production"
    ? process.env.CLIENT_URL?.split(",") || ["http://localhost:3000"]
    : ["http://localhost:3000", "http://127.0.0.1:3000"]
) as string[];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);

app.use(compression());
app.use(cookieParser());
app.use(hpp()); // Prevent HTTP Parameter Pollution

// Rate limiting (production only)
if (process.env.NODE_ENV === "production") {
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: "Too many requests from this IP, please try again later.",
  });
  app.use("/api/", limiter);

  // Stricter rate limiting for auth routes
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 auth requests per windowMs
    message: "Too many authentication attempts, please try again later.",
  });
  app.use("/api/auth/login", authLimiter);
  app.use("/api/auth/register", authLimiter);
}

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Connect to MongoDB Atlas
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI!, {
      serverSelectionTimeoutMS: 5000, 
    });
    console.log("MongoDB Atlas connected successfully");
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  }
};

connectDB();

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/consultations", consultationRoutes);
app.use("/api/lawyers", lawyerRoutes);
app.use("/api/cases", caseRoutes);
app.use("/api/admin", adminRoutes);

// Backwards-compatible/fallback endpoints in case frontend calls short paths
app.post("/resend-verification-code", express.json(), resendVerificationCode);
app.post(
  "/api/resend-verification-code",
  express.json(),
  resendVerificationCode,
);
app.post("/resend-code", express.json(), resendVerificationCode);
app.post("/api/resend-code", express.json(), resendVerificationCode);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    console.error(err.stack);
    res.status(500).json({ message: "Something went wrong!" });
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
