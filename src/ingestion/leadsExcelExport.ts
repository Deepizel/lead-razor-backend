import * as XLSX from "xlsx";
import type { Lead } from "../types/lead";

/** Column headers accepted by `parseLeadsExcel` (snake_case). */
export const LEAD_UPLOAD_COLUMNS = [
  "first_name",
  "last_name",
  "email",
  "company",
  "job_title",
  "phone",
  "source",
  "initial_message",
  "business_detail",
  "category_id",
] as const;

export type LeadUploadColumn = (typeof LEAD_UPLOAD_COLUMNS)[number];

export type LeadUploadRow = Record<LeadUploadColumn, string>;

const SHEET_NAME = "Leads Upload Template";

/** Example rows matching the product upload template. */
export const LEAD_UPLOAD_SAMPLE_ROWS: LeadUploadRow[] = [
  {
    first_name: "John",
    last_name: "Carter",
    email: "john.carter@stripe.com",
    company: "Stripe",
    job_title: "Engineering Manager",
    phone: "+1-202-555-0101",
    source: "LinkedIn",
    initial_message: "Interested in AI-powered lead qualification.",
    business_detail: "Fintech payments infrastructure platform.",
    category_id: "",
  },
  {
    first_name: "Sarah",
    last_name: "Nguyen",
    email: "sarah.nguyen@shopify.com",
    company: "Shopify",
    job_title: "Growth Lead",
    phone: "+1-202-555-0102",
    source: "Cold Email",
    initial_message: "Looking to automate lead scoring.",
    business_detail: "E-commerce platform helping merchants scale online stores.",
    category_id: "",
  },
  {
    first_name: "David",
    last_name: "Kim",
    email: "david.kim@notion.so",
    company: "Notion",
    job_title: "Product Manager",
    phone: "+1-202-555-0103",
    source: "Website",
    initial_message: "Exploring AI sales workflow integrations.",
    business_detail: "Productivity and collaboration software company.",
    category_id: "",
  },
  {
    first_name: "Emily",
    last_name: "Brown",
    email: "emily.brown@airtable.com",
    company: "Airtable",
    job_title: "Operations Director",
    phone: "+1-202-555-0104",
    source: "Referral",
    initial_message: "Needs better lead enrichment tools.",
    business_detail: "Cloud collaboration and database platform.",
    category_id: "",
  },
  {
    first_name: "Michael",
    last_name: "Lee",
    email: "michael.lee@hubspot.com",
    company: "HubSpot",
    job_title: "Sales Executive",
    phone: "+1-202-555-0105",
    source: "Conference",
    initial_message: "Interested in AI-driven outreach optimization.",
    business_detail: "CRM and marketing automation platform.",
    category_id: "",
  },
];

function rowToArray(row: LeadUploadRow): string[] {
  return LEAD_UPLOAD_COLUMNS.map((col) => row[col] ?? "");
}

export function leadDtoToUploadRow(lead: Lead): LeadUploadRow {
  return {
    first_name: lead.first_name,
    last_name: lead.last_name,
    email: lead.email,
    company: lead.company ?? "",
    job_title: lead.job_title ?? "",
    phone: lead.phone ?? "",
    source: lead.source ?? "",
    initial_message: lead.initial_message ?? "",
    business_detail: lead.business_detail ?? "",
    category_id: lead.category_id ?? "",
  };
}

export function buildLeadsUploadWorkbook(rows: LeadUploadRow[]): XLSX.WorkBook {
  const aoa: string[][] = [
    [...LEAD_UPLOAD_COLUMNS],
    ...rows.map(rowToArray),
  ];
  const sheet = XLSX.utils.aoa_to_sheet(aoa);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, SHEET_NAME);
  return workbook;
}

export function workbookToBuffer(workbook: XLSX.WorkBook): Buffer {
  return Buffer.from(
    XLSX.write(workbook, { type: "buffer", bookType: "xlsx" })
  );
}

export function buildUploadTemplateBuffer(includeSamples = true): Buffer {
  const rows = includeSamples ? LEAD_UPLOAD_SAMPLE_ROWS : [];
  return workbookToBuffer(buildLeadsUploadWorkbook(rows));
}

export function buildLeadsExportBuffer(leads: Lead[]): Buffer {
  const rows = leads.map(leadDtoToUploadRow);
  return workbookToBuffer(buildLeadsUploadWorkbook(rows));
}
