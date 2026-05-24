import { listLeads } from "../repositories/leadRepository";
import {
  buildLeadsExportBuffer,
  buildUploadTemplateBuffer,
} from "../ingestion/leadsExcelExport";

export function getUploadTemplateXlsx(includeSamples = true): Buffer {
  return buildUploadTemplateBuffer(includeSamples);
}

export async function exportUserLeadsXlsx(userId: string): Promise<Buffer> {
  const leads = await listLeads(userId, { sort: "created_at" });
  return buildLeadsExportBuffer(leads);
}
