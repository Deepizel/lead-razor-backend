"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashPassword = hashPassword;
exports.verifyPassword = verifyPassword;
exports.validatePasswordStrength = validatePasswordStrength;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const ROUNDS = 12;
async function hashPassword(password) {
    return bcryptjs_1.default.hash(password, ROUNDS);
}
async function verifyPassword(password, hash) {
    return bcryptjs_1.default.compare(password, hash);
}
function validatePasswordStrength(password) {
    if (password.length < 8) {
        return "Password must be at least 8 characters";
    }
    return null;
}
