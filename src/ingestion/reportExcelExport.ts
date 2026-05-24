import * as XLSX from "xlsx";

/** Human-readable report columns (order matters for the modal export). */
export const REPORT_EXPORT_HEADERS = [
  "Name",
  "Email",
  "Company",
  "Job Title",
  "LinkedIn URL",
  "Category",
  "Score",
  "Tier",
  "Intent",
  "AI Summary",
  "Emails Sent",
  "Opened",
  "Replies",
  "Booking Clicks",
  "Last Event",
  "Last Event Date",
] as const;

export type ReportExportRow = Record<(typeof REPORT_EXPORT_HEADERS)[number], string>;

const SHEET_NAME = "Leads Report";

export interface ReportLeadRecord {
  firstName: string;
  lastName: string;
  email: string;
  company: string | null;
  jobTitle: string | null;
  linkedinUrl: string | null;
  source: string | null;
  score: number;
  tier: string;
  emailsSent: number;
  emailsOpened: number;
  repliesReceived: number;
  bookingClicks: number;
  lastEventType: string | null;
  lastEventAt: Date | null;
  categoryName: string | null;
  snapshotSummary: string | null;
  snapshotIntent: string | null;
}

function formatDate(iso: Date | null): string {
  if (!iso) return "";
  return iso.toISOString();
}

export function reportRecordToRow(record: ReportLeadRecord): ReportExportRow {
  return {
    Name: `${record.firstName} ${record.lastName}`.trim(),
    Email: record.email,
    Company: record.company ?? "",
    "Job Title": record.jobTitle ?? "",
    "LinkedIn URL": record.linkedinUrl ?? "",
    Category: record.categoryName ?? "",
    Score: String(record.score),
    Tier: record.tier,
    Intent: record.snapshotIntent ?? "",
    "AI Summary": record.snapshotSummary ?? "",
    "Emails Sent": String(record.emailsSent),
    Opened: String(record.emailsOpened),
    Replies: String(record.repliesReceived),
    "Booking Clicks": String(record.bookingClicks),
    "Last Event": record.lastEventType ?? "",
    "Last Event Date": formatDate(record.lastEventAt),
  };
}

export function buildReportWorkbook(records: ReportLeadRecord[]): XLSX.WorkBook {
  const rows = records.map(reportRecordToRow);
  const aoa: string[][] = [
    [...REPORT_EXPORT_HEADERS],
    ...rows.map((row) => REPORT_EXPORT_HEADERS.map((h) => row[h])),
  ];
  const sheet = XLSX.utils.aoa_to_sheet(aoa);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, SHEET_NAME);
  return workbook;
}

export function reportWorkbookToBuffer(workbook: XLSX.WorkBook): Buffer {
  return Buffer.from(
    XLSX.write(workbook, { type: "buffer", bookType: "xlsx" })
  );
}

export function buildReportExportBuffer(records: ReportLeadRecord[]): Buffer {
  return reportWorkbookToBuffer(buildReportWorkbook(records));
}
