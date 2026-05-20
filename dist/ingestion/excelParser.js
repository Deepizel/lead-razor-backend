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
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseLeadsExcel = parseLeadsExcel;
const XLSX = __importStar(require("xlsx"));
const REQUIRED_COLUMNS = ["first_name", "last_name", "email"];
const COLUMN_ALIASES = {
    firstname: "first_name",
    first: "first_name",
    lastname: "last_name",
    last: "last_name",
    emailaddress: "email",
    mail: "email",
    companyname: "company",
    organisation: "company",
    organization: "company",
    title: "job_title",
    jobtitle: "job_title",
    job: "job_title",
    phonenumber: "phone",
    mobile: "phone",
    leadsource: "source",
    message: "initial_message",
    initialmessage: "initial_message",
    notes: "initial_message",
    businessdetail: "business_detail",
    business_detail: "business_detail",
    business_details: "business_detail",
    companydetails: "business_detail",
    company_details: "business_detail",
    about: "business_detail",
    lead_details: "business_detail",
    categoryid: "category_id",
    category: "category_id",
};
function normalizeHeader(header) {
    const key = header.trim().toLowerCase().replace(/\s+/g, "_");
    return COLUMN_ALIASES[key] ?? key;
}
function cellString(value) {
    if (value === null || value === undefined || value === "")
        return null;
    return String(value).trim() || null;
}
function cellEmail(value) {
    const s = cellString(value);
    return s ? s.toLowerCase() : null;
}
function parseLeadsExcel(buffer) {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
        return {
            rows: [],
            errors: [{ rowNumber: 0, error: "Workbook has no sheets" }],
            missingRequiredColumns: [...REQUIRED_COLUMNS],
        };
    }
    const sheet = workbook.Sheets[sheetName];
    const raw = XLSX.utils.sheet_to_json(sheet, {
        defval: null,
    });
    if (raw.length === 0) {
        return { rows: [], errors: [], missingRequiredColumns: [...REQUIRED_COLUMNS] };
    }
    const headerMap = new Map();
    for (const key of Object.keys(raw[0])) {
        headerMap.set(key, normalizeHeader(key));
    }
    const presentColumns = new Set(headerMap.values());
    const missingRequiredColumns = REQUIRED_COLUMNS.filter((c) => !presentColumns.has(c));
    if (missingRequiredColumns.length > 0) {
        return { rows: [], errors: [], missingRequiredColumns };
    }
    const rows = [];
    const errors = [];
    raw.forEach((record, index) => {
        const rowNumber = index + 2;
        const normalized = {};
        for (const [key, value] of Object.entries(record)) {
            normalized[headerMap.get(key) ?? normalizeHeader(key)] = value;
        }
        const email = cellEmail(normalized.email);
        const first_name = cellString(normalized.first_name);
        const last_name = cellString(normalized.last_name);
        if (!email || !first_name || !last_name) {
            errors.push({
                rowNumber,
                email: email ?? undefined,
                error: "Missing required field: first_name, last_name, or email",
            });
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            errors.push({ rowNumber, email, error: "Invalid email format" });
            return;
        }
        rows.push({
            rowNumber,
            first_name,
            last_name,
            email,
            company: cellString(normalized.company),
            job_title: cellString(normalized.job_title),
            phone: cellString(normalized.phone),
            source: cellString(normalized.source),
            initial_message: cellString(normalized.initial_message),
            business_detail: cellString(normalized.business_detail),
            category_id: cellString(normalized.category_id),
        });
    });
    return { rows, errors, missingRequiredColumns: [] };
}
