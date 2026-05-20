import { prisma } from "../db/prisma";
import { toCategoryDto } from "../lib/prismaMappers";
import type { Category } from "../types/lead";

const DEFAULT_OFFERING =
  "We help B2B companies improve their sales pipeline.";
const DEFAULT_STATEMENT =
  "A good fit is an engaged decision-maker exploring solutions in our space.";

export function defaultCategoryFallback(): Category {
  return {
    id: "00000000-0000-0000-0000-000000000000",
    name: "General",
    offering: DEFAULT_OFFERING,
    statement: DEFAULT_STATEMENT,
    created_at: new Date(),
    updated_at: new Date(),
  };
}

export async function listCategories(userId: string): Promise<Category[]> {
  const categories = await prisma.category.findMany({
    where: { userId },
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
  userId: string,
  input: CreateCategoryInput
): Promise<Category> {
  const category = await prisma.category.create({
    data: {
      userId,
      name: input.name.trim(),
      offering: input.offering.trim(),
      statement: input.statement.trim(),
    },
  });
  return toCategoryDto(category);
}

export interface UpdateCategoryInput {
  name?: string;
  offering?: string;
  statement?: string;
}

export async function updateCategory(
  userId: string,
  id: string,
  input: UpdateCategoryInput
): Promise<Category | null> {
  const existing = await prisma.category.findFirst({
    where: { id, userId },
  });
  if (!existing) return null;

  const category = await prisma.category.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.offering !== undefined && { offering: input.offering.trim() }),
      ...(input.statement !== undefined && { statement: input.statement.trim() }),
    },
  });
  return toCategoryDto(category);
}

export async function findCategoryById(
  userId: string,
  id: string
): Promise<Category | null> {
  const category = await prisma.category.findFirst({
    where: { id, userId },
  });
  return category ? toCategoryDto(category) : null;
}

/** LLM profiling — user's category or inline default when none assigned */
export async function getCategoryById(
  userId: string,
  id: string | null
): Promise<Category> {
  if (!id) return defaultCategoryFallback();
  const category = await findCategoryById(userId, id);
  return category ?? defaultCategoryFallback();
}
