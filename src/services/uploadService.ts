import { v4 as uuidv4 } from "uuid";
import { parseLeadsExcel } from "../ingestion/excelParser";
import { upsertLeadFromRow } from "../repositories/leadRepository";
import {
  createLeadUpload,
  finalizeLeadUpload,
} from "../repositories/uploadRepository";
import { queueLeadProfiling } from "./profilingQueueService";

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
  defaultCategoryId?: string | null,
  sourceLabel?: string | null
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

  const uploadRecord = await createLeadUpload({
    userId,
    externalUploadId: uploadId,
    defaultCategoryId,
    rowCount: parsed.rows.length + parsed.errors.length,
    createdCount: 0,
    updatedCount: 0,
    errorCount: parsed.errors.length,
    sourceLabel,
  });

  for (const row of parsed.rows) {
    try {
      const categoryId = row.category_id ?? defaultCategoryId ?? null;
      const { lead, isNew } = await upsertLeadFromRow(
        userId,
        row,
        categoryId,
        uploadRecord.id
      );
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

  await finalizeLeadUpload(uploadRecord.id, {
    createdCount: created,
    updatedCount: updated,
    errorCount: rowErrors.length,
  });

  const profilingQueued = queueLeadProfiling(userId, leadIdsForProfiling);

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
