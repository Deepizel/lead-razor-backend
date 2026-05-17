import { prisma } from "../db/prisma";
import { toCategoryDto } from "../lib/prismaMappers";
import type { Category } from "../types/lead";

const DEFAULT_CATEGORY: Category = {
  id: "00000000-0000-0000-0000-000000000000",
  name: "General",
  offering: "We help B2B companies improve their sales pipeline.",
  statement:
    "A good fit is an engaged decision-maker exploring solutions in our space.",
  created_at: new Date(),
  updated_at: new Date(),
};

export async function listCategories(): Promise<Category[]> {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
  });
  return categories.map(toCategoryDto);
}

export interface CreateCategoryInput {
  name: string;
  offering: string;
  statement: string;
}

export async function createCategory(
  input: CreateCategoryInput
): Promise<Category> {
  const category = await prisma.category.create({
    data: {
      name: input.name.trim(),
      offering: input.offering.trim(),
      statement: input.statement.trim(),
    },
  });
  return toCategoryDto(category);
}

/** For API — returns null if the category does not exist. */
export async function findCategoryById(id: string): Promise<Category | null> {
  const category = await prisma.category.findUnique({ where: { id } });
  return category ? toCategoryDto(category) : null;
}

/** For internal use (e.g. LLM profiling) — falls back to a default when missing. */
export async function getCategoryById(
  id: string | null
): Promise<Category> {
  if (!id) return DEFAULT_CATEGORY;
  const category = await findCategoryById(id);
  return category ?? DEFAULT_CATEGORY;
}
