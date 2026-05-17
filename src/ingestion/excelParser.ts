import * as XLSX from "xlsx";

export interface ParsedLeadRow {
  rowNumber: number;
  first_name: string;
  last_name: string;
  email: string;
  company?: string | null;
  job_title?: string | null;
  phone?: string | null;
  source?: string | null;
  initial_message?: string | null;
  category_id?: string | null;
}

export interface ExcelParseError {
  rowNumber: number;
  email?: string;
  error: string;
}

export interface ExcelParseResult {
  rows: ParsedLeadRow[];
  errors: ExcelParseError[];
  missingRequiredColumns: string[];
}

const REQUIRED_COLUMNS = ["first_name", "last_name", "email"] as const;

const COLUMN_ALIASES: Record<string, string> = {
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
  categoryid: "category_id",
  category: "category_id",
};

function normalizeHeader(header: string): string {
  const key = header.trim().toLowerCase().replace(/\s+/g, "_");
  return COLUMN_ALIASES[key] ?? key;
}

function cellString(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  return String(value).trim() || null;
}

function cellEmail(value: unknown): string | null {
  const s = cellString(value);
  return s ? s.toLowerCase() : null;
}

export function parseLeadsExcel(buffer: Buffer): ExcelParseResult {
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
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: null,
  });

  if (raw.length === 0) {
    return { rows: [], errors: [], missingRequiredColumns: [...REQUIRED_COLUMNS] };
  }

  const headerMap = new Map<string, string>();
  for (const key of Object.keys(raw[0])) {
    headerMap.set(key, normalizeHeader(key));
  }

  const presentColumns = new Set(headerMap.values());
  const missingRequiredColumns = REQUIRED_COLUMNS.filter(
    (c) => !presentColumns.has(c)
  );

  if (missingRequiredColumns.length > 0) {
    return { rows: [], errors: [], missingRequiredColumns };
  }

  const rows: ParsedLeadRow[] = [];
  const errors: ExcelParseError[] = [];

  raw.forEach((record, index) => {
    const rowNumber = index + 2;
    const normalized: Record<string, unknown> = {};
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
      category_id: cellString(normalized.category_id),
    });
  });

  return { rows, errors, missingRequiredColumns: [] };
}
