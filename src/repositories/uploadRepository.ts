import { prisma } from "../db/prisma";

export interface CreateLeadUploadInput {
  userId: string;
  externalUploadId: string;
  defaultCategoryId?: string | null;
  rowCount: number;
  createdCount: number;
  updatedCount: number;
  errorCount: number;
  sourceLabel?: string | null;
}

export async function createLeadUpload(input: CreateLeadUploadInput) {
  return prisma.leadUpload.create({
    data: {
      userId: input.userId,
      externalUploadId: input.externalUploadId,
      defaultCategoryId: input.defaultCategoryId ?? null,
      rowCount: input.rowCount,
      createdCount: input.createdCount,
      updatedCount: input.updatedCount,
      errorCount: input.errorCount,
      sourceLabel: input.sourceLabel ?? null,
    },
  });
}

export async function finalizeLeadUpload(
  id: string,
  counts: {
    createdCount: number;
    updatedCount: number;
    errorCount: number;
  }
) {
  return prisma.leadUpload.update({
    where: { id },
    data: {
      createdCount: counts.createdCount,
      updatedCount: counts.updatedCount,
      errorCount: counts.errorCount,
    },
  });
}

export async function listLeadUploads(userId: string, limit = 20) {
  return prisma.leadUpload.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
