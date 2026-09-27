"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashPassword = exports.PASSWORD_HASH_ROUNDS = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const UserSchema = new mongoose_1.Schema({
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false }, // Hidden by default
    role: { type: String, enum: ['admin', 'lawyer', 'client'], default: 'client' },
    barId: { type: String, sparse: true },
    phone: { type: String },
    specialization: { type: String },
    isVerified: { type: Boolean, default: false },
    passwordNeedsChange: { type: Boolean, default: false },
    profileImageUrl: { type: String, trim: true },
    emailVerificationCodeHash: { type: String, select: false },
    emailVerificationExpiresAt: { type: Date, select: false },
    emailVerificationSentAt: { type: Date },
    emailVerificationAttempts: { type: Number, default: 0, select: false },
    passwordResetTokenHash: { type: String, select: false, index: true, sparse: true },
    passwordResetExpiresAt: { type: Date, select: false },
    passwordResetSentAt: { type: Date, select: false },
    passwordChangedAt: { type: Date },
    tokenVersion: { type: Number, default: 0 },
}, { timestamps: true });
exports.PASSWORD_HASH_ROUNDS = 12;
// For atomic updateOne() writes, which skip the save hook below
const hashPassword = (password) => bcryptjs_1.default.hash(password, exports.PASSWORD_HASH_ROUNDS);
exports.hashPassword = hashPassword;
// Hash password before saving
UserSchema.pre('save', async function () {
    // Only run this function if password was modified
    if (!this.isModified('password'))
        return;
    this.password = await (0, exports.hashPassword)(this.password);
});
// Compare password method
UserSchema.methods.comparePassword = async function (password) {
    return bcryptjs_1.default.compare(password, this.password);
};
exports.default = mongoose_1.default.model('User', UserSchema);
//# sourceMappingURL=User.js.map