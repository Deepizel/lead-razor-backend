"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.categoriesRouter = void 0;
const express_1 = require("express");
const categoryRepository_1 = require("../repositories/categoryRepository");
exports.categoriesRouter = (0, express_1.Router)();
function categoryIdParam(req) {
    const id = req.params.id;
    return Array.isArray(id) ? id[0] : id;
}
exports.categoriesRouter.get("/", async (req, res) => {
    try {
        const categories = await (0, categoryRepository_1.listCategories)(req.user.id);
        res.json({ categories });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to list categories" });
    }
});
exports.categoriesRouter.get("/:id", async (req, res) => {
    try {
        const category = await (0, categoryRepository_1.findCategoryById)(req.user.id, categoryIdParam(req));
        if (!category) {
            res.status(404).json({ error: "Category not found" });
            return;
        }
        res.json({ category });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch category" });
    }
});
exports.categoriesRouter.post("/", async (req, res) => {
    try {
        const { name, offering, statement } = req.body ?? {};
        if (typeof name !== "string" ||
            !name.trim() ||
            typeof offering !== "string" ||
            !offering.trim() ||
            typeof statement !== "string" ||
            !statement.trim()) {
            res.status(400).json({
                error: "name, offering, and statement are required non-empty strings",
            });
            return;
        }
        const category = await (0, categoryRepository_1.createCategory)(req.user.id, {
            name,
            offering,
            statement,
        });
        res.status(201).json({ category });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to create category" });
    }
});
exports.categoriesRouter.patch("/:id", async (req, res) => {
    try {
        const { name, offering, statement } = req.body ?? {};
        if (name !== undefined &&
            (typeof name !== "string" || !name.trim())) {
            res.status(400).json({ error: "name must be a non-empty string" });
            return;
        }
        if (offering !== undefined &&
            (typeof offering !== "string" || !offering.trim())) {
            res.status(400).json({ error: "offering must be a non-empty string" });
            return;
        }
        if (statement !== undefined &&
            (typeof statement !== "string" || !statement.trim())) {
            res.status(400).json({ error: "statement must be a non-empty string" });
            return;
        }
        if (name === undefined && offering === undefined && statement === undefined) {
            res.status(400).json({
                error: "Provide at least one of: name, offering, statement",
            });
            return;
        }
        const category = await (0, categoryRepository_1.updateCategory)(req.user.id, categoryIdParam(req), {
            name,
            offering,
            statement,
        });
        if (!category) {
            res.status(404).json({ error: "Category not found" });
            return;
        }
        res.json({ category });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to update category" });
    }
});
