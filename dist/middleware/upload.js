"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.excelUpload = void 0;
const multer_1 = __importDefault(require("multer"));
const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
exports.excelUpload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        const isXlsx = file.mimetype === XLSX_MIME ||
            file.originalname.toLowerCase().endsWith(".xlsx");
        cb(null, isXlsx);
    },
});
