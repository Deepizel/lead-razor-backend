import { Router, Request, Response } from "express";
import {
  createCategory,
  listCategories,
} from "../repositories/categoryRepository";

export const categoriesRouter = Router();

categoriesRouter.get("/", async (_req: Request, res: Response) => {
  try {
    const categories = await listCategories();
    res.json({ categories });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to list categories" });
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
