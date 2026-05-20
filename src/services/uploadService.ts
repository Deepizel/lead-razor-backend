import { v4 as uuidv4 } from "uuid";
import { parseLeadsExcel } from "../ingestion/excelParser";
import { upsertLeadFromRow } from "../repositories/leadRepository";
import { refreshLeadSnapshot } from "./snapshotService";
import { env } from "../config/env";

export interface UploadResult {
  uploadId: string;
  rowCount: number;
  processed: number;
  created: number;
  updated: number;
  errors: Array<{ rowNumber: number; email?: string; error: string }>;
  profilingQueued: number;
}

export async function processLeadsUpload(
  userId: string,
  fileBuffer: Buffer,
  defaultCategoryId?: string | null
): Promise<UploadResult> {
  const uploadId = uuidv4();
  const parsed = parseLeadsExcel(fileBuffer);

  if (parsed.missingRequiredColumns.length > 0) {
    throw new Error(
      `Missing required columns: ${parsed.missingRequiredColumns.join(", ")}`
    );
  }

  let created = 0;
  let updated = 0;
  const rowErrors = [...parsed.errors];
  const leadIdsForProfiling: string[] = [];

  for (const row of parsed.rows) {
    try {
      const categoryId = row.category_id ?? defaultCategoryId ?? null;
      const { lead, isNew } = await upsertLeadFromRow(userId, row, categoryId);
      if (isNew) created += 1;
      else updated += 1;
      leadIdsForProfiling.push(lead.id);
    } catch (err) {
      rowErrors.push({
        rowNumber: row.rowNumber,
        email: row.email,
        error: err instanceof Error ? err.message : "Failed to save lead",
      });
    }
  }

  const profilingQueued = queueProfiling(userId, leadIdsForProfiling);

  return {
    uploadId,
    rowCount: parsed.rows.length + parsed.errors.length,
    processed: created + updated,
    created,
    updated,
    errors: rowErrors,
    profilingQueued,
  };
}

function queueProfiling(userId: string, leadIds: string[]): number {
  if (!env.openaiApiKey || leadIds.length === 0) return 0;

  for (const leadId of leadIds) {
    setImmediate(() => {
      refreshLeadSnapshot(leadId, { userId }).catch((err) => {
        console.error(`Profiling failed for lead ${leadId}:`, err);
      });
    });
  }

  return leadIds.length;
}
