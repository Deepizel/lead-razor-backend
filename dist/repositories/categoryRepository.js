"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultCategoryFallback = defaultCategoryFallback;
exports.listCategories = listCategories;
exports.createCategory = createCategory;
exports.updateCategory = updateCategory;
exports.findCategoryById = findCategoryById;
exports.getCategoryById = getCategoryById;
const prisma_1 = require("../db/prisma");
const prismaMappers_1 = require("../lib/prismaMappers");
const DEFAULT_OFFERING = "We help B2B companies improve their sales pipeline.";
const DEFAULT_STATEMENT = "A good fit is an engaged decision-maker exploring solutions in our space.";
function defaultCategoryFallback() {
    return {
        id: "00000000-0000-0000-0000-000000000000",
        name: "General",
        offering: DEFAULT_OFFERING,
        statement: DEFAULT_STATEMENT,
        created_at: new Date(),
        updated_at: new Date(),
    };
}
async function listCategories(userId) {
    const categories = await prisma_1.prisma.category.findMany({
        where: { userId },
        orderBy: { name: "asc" },
    });
    return categories.map(prismaMappers_1.toCategoryDto);
}
async function createCategory(userId, input) {
    const category = await prisma_1.prisma.category.create({
        data: {
            userId,
            name: input.name.trim(),
            offering: input.offering.trim(),
            statement: input.statement.trim(),
        },
    });
    return (0, prismaMappers_1.toCategoryDto)(category);
}
async function updateCategory(userId, id, input) {
    const existing = await prisma_1.prisma.category.findFirst({
        where: { id, userId },
    });
    if (!existing)
        return null;
    const category = await prisma_1.prisma.category.update({
        where: { id },
        data: {
            ...(input.name !== undefined && { name: input.name.trim() }),
            ...(input.offering !== undefined && { offering: input.offering.trim() }),
            ...(input.statement !== undefined && { statement: input.statement.trim() }),
        },
    });
    return (0, prismaMappers_1.toCategoryDto)(category);
}
async function findCategoryById(userId, id) {
    const category = await prisma_1.prisma.category.findFirst({
        where: { id, userId },
    });
    return category ? (0, prismaMappers_1.toCategoryDto)(category) : null;
}
/** LLM profiling — user's category or inline default when none assigned */
async function getCategoryById(userId, id) {
    if (!id)
        return defaultCategoryFallback();
    const category = await findCategoryById(userId, id);
    return category ?? defaultCategoryFallback();
}
