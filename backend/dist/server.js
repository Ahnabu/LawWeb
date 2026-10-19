"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = exports.connectDB = void 0;
const env_1 = require("./config/env"); // Must be first — loads .env before any other module reads process.env
const dns_1 = __importDefault(require("dns"));
const express_1 = __importDefault(require("express"));
const mongoose_1 = __importDefault(require("mongoose"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const hpp_1 = __importDefault(require("hpp"));
// Routes
const auth_1 = __importDefault(require("./routes/auth"));
const consultations_1 = __importDefault(require("./routes/consultations"));
const lawyers_1 = __importDefault(require("./routes/lawyers"));
const cases_1 = __importDefault(require("./routes/cases"));
const admin_1 = __importDefault(require("./routes/admin"));
const users_1 = __importDefault(require("./routes/users"));
const blogs_1 = __importDefault(require("./routes/blogs"));
const content_1 = __importDefault(require("./routes/content"));
const contact_1 = __importDefault(require("./routes/contact"));
const security_1 = require("./middleware/security");
// Use Google public DNS so mongodb+srv SRV lookups resolve reliably in local/cloud environments
try {
    dns_1.default.setServers(["8.8.8.8", "8.8.4.4"]);
}
catch {
    // Ignore in sandboxed serverless environments
}
(0, env_1.assertServerEnv)();
const app = (0, express_1.default)();
exports.app = app;
const PORT = process.env.PORT || 5000;
// Behind Render/Railway/Vercel/Nginx the client IP is in X-Forwarded-For.
if (process.env.TRUST_PROXY) {
    const hops = Number(process.env.TRUST_PROXY);
    app.set("trust proxy", Number.isNaN(hops) ? process.env.TRUST_PROXY : hops);
}
else if (process.env.VERCEL) {
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
app.use((0, helmet_1.default)({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
}));
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
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        if (!origin)
            return callback(null, true);
        const cleanOrigin = origin.trim().replace(/\/+$/, "");
        if (allowedOrigins.includes(cleanOrigin))
            return callback(null, true);
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
}));
app.use((0, compression_1.default)());
app.use((0, cookie_parser_1.default)());
app.use((0, hpp_1.default)()); // Prevent HTTP Parameter Pollution
app.use("/api", (0, security_1.requireTrustedOrigin)(allowedOrigins)); // CSRF protection for cookie auth
// Rate limiting (production only)
if (process.env.NODE_ENV === "production") {
    const limiter = (0, express_rate_limit_1.default)({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 300, // dashboards fire several requests per page
        standardHeaders: "draft-7",
        legacyHeaders: false,
        message: { message: "Too many requests from this IP, please try again later." },
    });
    app.use("/api/", limiter);
    // Credential and code guessing
    const authLimiter = (0, express_rate_limit_1.default)({
        windowMs: 15 * 60 * 1000,
        max: 20,
        standardHeaders: "draft-7",
        legacyHeaders: false,
        message: { message: "Too many authentication attempts, please try again later." },
    });
    ["/api/auth/login", "/api/auth/register", "/api/auth/verify-email", "/api/auth/reset-password", "/api/auth/change-password"].forEach((path) => app.use(path, authLimiter));
    // Endpoints that send email: protects inboxes and the Resend quota
    const emailLimiter = (0, express_rate_limit_1.default)({
        windowMs: 60 * 60 * 1000,
        max: 10,
        standardHeaders: "draft-7",
        legacyHeaders: false,
        message: { message: "Too many email requests, please try again later." },
    });
    ["/api/auth/forgot-password", "/api/auth/resend-verification-code"].forEach((path) => app.use(path, emailLimiter));
    // Public Contact page form: stops message floods from one IP
    app.use("/api/contact", (0, express_rate_limit_1.default)({
        windowMs: 60 * 60 * 1000,
        max: 5,
        standardHeaders: "draft-7",
        legacyHeaders: false,
        message: { message: "Too many messages sent. Please try again later or call us." },
    }));
    // Public case lookup (case number + email)
    app.use("/api/cases/track", (0, express_rate_limit_1.default)({ windowMs: 15 * 60 * 1000, max: 30, standardHeaders: "draft-7", legacyHeaders: false }));
}
// File uploads go through multer, so JSON bodies stay small
app.use(express_1.default.json({ limit: "1mb" }));
app.use(express_1.default.urlencoded({ extended: false, limit: "100kb" }));
app.use(security_1.sanitizeInput);
// MongoDB Atlas Connection with Serverless Connection Pooling/Caching
let dbPromise = null;
const connectDB = async () => {
    if (mongoose_1.default.connection.readyState === 1) {
        return;
    }
    if (mongoose_1.default.connection.readyState === 2 && dbPromise) {
        await dbPromise;
        return;
    }
    if (!process.env.MONGODB_URI) {
        throw new Error("MONGODB_URI environment variable is missing");
    }
    try {
        dbPromise = mongoose_1.default.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 15000,
            connectTimeoutMS: 15000,
            socketTimeoutMS: 45000,
        });
        await dbPromise;
        console.log("MongoDB Atlas connected successfully");
    }
    catch (error) {
        dbPromise = null;
        console.error("MongoDB connection error:", error);
        if (!process.env.VERCEL) {
            console.log("Retrying MongoDB connection in 5 seconds...");
            setTimeout(exports.connectDB, 5000);
        }
        throw error;
    }
};
exports.connectDB = connectDB;
// Initial connection attempt on boot
(0, exports.connectDB)().catch((err) => {
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
        await (0, exports.connectDB)();
        next();
    }
    catch (err) {
        console.error("Database connection failed on request:", err);
        res.status(503).json({ message: "Service temporarily unavailable: database connection error" });
    }
});
// Root & Health check
app.get("/", (_req, res) => {
    res.json({
        status: "OK",
        name: "Islam & Associates International API",
        database: mongoose_1.default.connection.readyState === 1 ? "connected" : "connecting/disconnected",
        timestamp: new Date().toISOString(),
    });
});
app.get("/api/health", (_req, res) => {
    res.json({
        status: "OK",
        database: mongoose_1.default.connection.readyState === 1 ? "connected" : "connecting/disconnected",
        timestamp: new Date().toISOString(),
    });
});
// Routes
app.use("/api/auth", auth_1.default);
app.use("/api/consultations", consultations_1.default);
app.use("/api/lawyers", lawyers_1.default);
app.use("/api/cases", cases_1.default);
app.use("/api/admin", admin_1.default);
app.use("/api/users", users_1.default);
app.use("/api/blogs", blogs_1.default);
app.use("/api/content", content_1.default);
app.use("/api/contact", contact_1.default);
// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: "Something went wrong!" });
    next();
});
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
exports.default = app;
//# sourceMappingURL=server.js.map