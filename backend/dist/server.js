"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const mongoose_1 = __importDefault(require("mongoose"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const hpp_1 = __importDefault(require("hpp"));
const dotenv_1 = __importDefault(require("dotenv"));
// Routes
const auth_1 = __importDefault(require("./routes/auth"));
const consultations_1 = __importDefault(require("./routes/consultations"));
const lawyers_1 = __importDefault(require("./routes/lawyers"));
const cases_1 = __importDefault(require("./routes/cases"));
const admin_1 = __importDefault(require("./routes/admin"));
const authController_1 = require("./controllers/authController");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
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
const allowedOrigins = (process.env.NODE_ENV === "production"
    ? process.env.CLIENT_URL?.split(",") || ["http://localhost:3000"]
    : ["http://localhost:3000", "http://127.0.0.1:3000"]);
app.use((0, cors_1.default)({
    origin: allowedOrigins,
    credentials: true,
}));
app.use((0, compression_1.default)());
app.use((0, cookie_parser_1.default)());
app.use((0, hpp_1.default)()); // Prevent HTTP Parameter Pollution
// Rate limiting (production only)
if (process.env.NODE_ENV === "production") {
    const limiter = (0, express_rate_limit_1.default)({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // limit each IP to 100 requests per windowMs
        message: "Too many requests from this IP, please try again later.",
    });
    app.use("/api/", limiter);
    // Stricter rate limiting for auth routes
    const authLimiter = (0, express_rate_limit_1.default)({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 5, // limit each IP to 5 auth requests per windowMs
        message: "Too many authentication attempts, please try again later.",
    });
    app.use("/api/auth/login", authLimiter);
    app.use("/api/auth/register", authLimiter);
}
app.use(express_1.default.json({ limit: "10mb" }));
app.use(express_1.default.urlencoded({ extended: true, limit: "10mb" }));
// Connect to MongoDB Atlas
const connectDB = async () => {
    try {
        await mongoose_1.default.connect(process.env.MONGODB_URI, {
            serverSelectionTimeoutMS: 5000,
        });
        console.log("MongoDB Atlas connected successfully");
    }
    catch (error) {
        console.error("MongoDB connection error:", error);
        process.exit(1);
    }
};
connectDB();
// Routes
app.use("/api/auth", auth_1.default);
app.use("/api/consultations", consultations_1.default);
app.use("/api/lawyers", lawyers_1.default);
app.use("/api/cases", cases_1.default);
app.use("/api/admin", admin_1.default);
// Backwards-compatible/fallback endpoints in case frontend calls short paths
app.post("/resend-verification-code", express_1.default.json(), authController_1.resendVerificationCode);
app.post("/api/resend-verification-code", express_1.default.json(), authController_1.resendVerificationCode);
app.post("/resend-code", express_1.default.json(), authController_1.resendVerificationCode);
app.post("/api/resend-code", express_1.default.json(), authController_1.resendVerificationCode);
// Health check
app.get("/api/health", (req, res) => {
    res.json({ status: "OK", timestamp: new Date().toISOString() });
});
// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: "Something went wrong!" });
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