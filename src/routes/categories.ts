import { Router, Request, Response } from "express";
import {
  createCategory,
  findCategoryById,
  listCategories,
  updateCategory,
} from "../repositories/categoryRepository";

export const categoriesRouter = Router();

function categoryIdParam(req: Request): string {
  const id = req.params.id;
  return Array.isArray(id) ? id[0] : id;
}

categoriesRouter.get("/", async (_req: Request, res: Response) => {
  try {
    const categories = await listCategories();
    res.json({ categories });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to list categories" });
  }
});

categoriesRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const category = await findCategoryById(categoryIdParam(req));
    if (!category) {
      res.status(404).json({ error: "Category not found" });
      return;
    }
    res.json({ category });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch category" });
  }
});

categoriesRouter.post("/", async (req: Request, res: Response) => {
  try {
    const { name, offering, statement } = req.body ?? {};

    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof offering !== "string" ||
      !offering.trim() ||
      typeof statement !== "string" ||
      !statement.trim()
    ) {
      res.status(400).json({
        error: "name, offering, and statement are required non-empty strings",
      });
      return;
    }

    const category = await createCategory({ name, offering, statement });
    res.status(201).json({ category });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create category" });
  }
});

categoriesRouter.patch("/:id", async (req: Request, res: Response) => {
  try {
    const { name, offering, statement } = req.body ?? {};

    if (
      name !== undefined &&
      (typeof name !== "string" || !name.trim())
    ) {
      res.status(400).json({ error: "name must be a non-empty string" });
      return;
    }
    if (
      offering !== undefined &&
      (typeof offering !== "string" || !offering.trim())
    ) {
      res.status(400).json({ error: "offering must be a non-empty string" });
      return;
    }
    if (
      statement !== undefined &&
      (typeof statement !== "string" || !statement.trim())
    ) {
      res.status(400).json({ error: "statement must be a non-empty string" });
      return;
    }

    if (name === undefined && offering === undefined && statement === undefined) {
      res.status(400).json({
        error: "Provide at least one of: name, offering, statement",
      });
      return;
    }

    const category = await updateCategory(categoryIdParam(req), {
      name,
      offering,
      statement,
    });

    if (!category) {
      res.status(404).json({ error: "Category not found" });
      return;
    }

    res.json({ category });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update category" });
  }
});
