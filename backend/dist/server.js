"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
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
const security_1 = require("./middleware/security");
// Use Google public DNS so mongodb+srv SRV lookups resolve reliably
dns_1.default.setServers(["8.8.8.8", "8.8.4.4"]);
(0, env_1.assertServerEnv)();
const app = (0, express_1.default)();
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
const allowedOrigins = [
    ...(process.env.NODE_ENV === "production" ? [] : ["http://localhost:3000", "http://127.0.0.1:3000"]),
    "https://law-web-five.vercel.app",
    ...clientUrls,
];
app.use((0, cors_1.default)({
    origin: allowedOrigins,
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
    // Public case lookup (case number + email)
    app.use("/api/cases/track", (0, express_rate_limit_1.default)({ windowMs: 15 * 60 * 1000, max: 30, standardHeaders: "draft-7", legacyHeaders: false }));
}
// File uploads go through multer, so JSON bodies stay small
app.use(express_1.default.json({ limit: "1mb" }));
app.use(express_1.default.urlencoded({ extended: false, limit: "100kb" }));
app.use(security_1.sanitizeInput);
// Connect to MongoDB Atlas
const connectDB = async () => {
    try {
        await mongoose_1.default.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 30000,
            connectTimeoutMS: 30000,
            socketTimeoutMS: 45000,
        });
        console.log("MongoDB Atlas connected successfully");
    }
    catch (error) {
        console.error("MongoDB connection error:", error);
        console.log("Retrying MongoDB connection in 5 seconds...");
        setTimeout(connectDB, 5000);
    }
};
connectDB();
// Routes
app.use("/api/auth", auth_1.default);
app.use("/api/consultations", consultations_1.default);
app.use("/api/lawyers", lawyers_1.default);
app.use("/api/cases", cases_1.default);
app.use("/api/admin", admin_1.default);
app.use("/api/users", users_1.default);
app.use("/api/blogs", blogs_1.default);
app.use("/api/content", content_1.default);
// Health check
app.get("/api/health", (req, res) => {
    res.json({ status: "OK", timestamp: new Date().toISOString() });
});
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
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
});
//# sourceMappingURL=server.js.map