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

export async function getCategoryById(
  id: string | null
): Promise<Category> {
  if (!id) return DEFAULT_CATEGORY;

  const category = await prisma.category.findUnique({ where: { id } });
  return category ? toCategoryDto(category) : DEFAULT_CATEGORY;
}
