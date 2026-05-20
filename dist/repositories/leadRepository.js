"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listLeads = listLeads;
exports.getLeadById = getLeadById;
exports.updateLead = updateLead;
exports.upsertLeadFromRow = upsertLeadFromRow;
exports.incrementEmailsSent = incrementEmailsSent;
const prisma_1 = require("../db/prisma");
const prismaMappers_1 = require("../lib/prismaMappers");
const scoringService_1 = require("../services/scoringService");
async function listLeads(userId, options = {}) {
    const { tier, sort = "score" } = options;
    const leads = await prisma_1.prisma.lead.findMany({
        where: { userId, ...(tier ? { tier } : {}) },
        orderBy: sort === "created_at" ? { createdAt: "desc" } : { score: "desc" },
        include: {
            snapshot: {
                select: { summary: true, currentIntent: true },
            },
        },
    });
    return leads.map((lead) => {
        const dto = (0, prismaMappers_1.toLeadDto)(lead);
        return {
            ...dto,
            snapshot_summary: lead.snapshot?.summary ?? null,
            snapshot_intent: lead.snapshot?.currentIntent ?? null,
        };
    });
}
async function getLeadById(userId, id) {
    const lead = await prisma_1.prisma.lead.findFirst({
        where: { id, userId },
    });
    return lead ? (0, prismaMappers_1.toLeadDto)(lead) : null;
}
async function updateLead(userId, id, input) {
    const existing = await prisma_1.prisma.lead.findFirst({
        where: { id, userId },
    });
    if (!existing)
        return null;
    if (input.email && input.email.toLowerCase() !== existing.email) {
        const conflict = await prisma_1.prisma.lead.findUnique({
            where: {
                userId_email: { userId, email: input.email.toLowerCase() },
            },
        });
        if (conflict && conflict.id !== id) {
            throw new Error("Email already in use by another lead");
        }
    }
    if (input.category_id) {
        const cat = await prisma_1.prisma.category.findFirst({
            where: { id: input.category_id, userId },
        });
        if (!cat)
            throw new Error("Category not found");
    }
    const lead = await prisma_1.prisma.lead.update({
        where: { id },
        data: {
            ...(input.category_id !== undefined && {
                categoryId: input.category_id,
            }),
            ...(input.first_name !== undefined && {
                firstName: input.first_name.trim(),
            }),
            ...(input.last_name !== undefined && {
                lastName: input.last_name.trim(),
            }),
            ...(input.email !== undefined && {
                email: input.email.toLowerCase().trim(),
            }),
            ...(input.company !== undefined && { company: input.company }),
            ...(input.job_title !== undefined && { jobTitle: input.job_title }),
            ...(input.phone !== undefined && { phone: input.phone }),
            ...(input.source !== undefined && { source: input.source }),
            ...(input.initial_message !== undefined && {
                initialMessage: input.initial_message,
            }),
            ...(input.business_detail !== undefined && {
                businessDetail: input.business_detail,
            }),
        },
    });
    const dto = (0, prismaMappers_1.toLeadDto)(lead);
    const { score, tier } = (0, scoringService_1.calculateScore)(dto);
    const scored = await prisma_1.prisma.lead.update({
        where: { id },
        data: { score, tier },
    });
    return (0, prismaMappers_1.toLeadDto)(scored);
}
async function upsertLeadFromRow(userId, row, defaultCategoryId) {
    const categoryId = row.category_id ?? defaultCategoryId ?? null;
    if (categoryId) {
        const cat = await prisma_1.prisma.category.findFirst({
            where: { id: categoryId, userId },
        });
        if (!cat)
            throw new Error("Category not found or does not belong to you");
    }
    const existing = await prisma_1.prisma.lead.findUnique({
        where: { userId_email: { userId, email: row.email } },
    });
    const data = {
        userId,
        categoryId,
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email,
        company: row.company ?? null,
        jobTitle: row.job_title ?? null,
        phone: row.phone ?? null,
        source: row.source ?? null,
        initialMessage: row.initial_message ?? null,
        businessDetail: row.business_detail ?? null,
    };
    const lead = existing
        ? await prisma_1.prisma.lead.update({
            where: { userId_email: { userId, email: row.email } },
            data,
        })
        : await prisma_1.prisma.lead.create({ data });
    const dto = (0, prismaMappers_1.toLeadDto)(lead);
    const { score, tier } = (0, scoringService_1.calculateScore)(dto);
    const scored = await prisma_1.prisma.lead.update({
        where: { id: lead.id },
        data: { score, tier },
    });
    return { lead: (0, prismaMappers_1.toLeadDto)(scored), isNew: !existing };
}
async function incrementEmailsSent(userId, leadId) {
    const existing = await prisma_1.prisma.lead.findFirst({
        where: { id: leadId, userId },
    });
    if (!existing)
        throw new Error(`Lead not found: ${leadId}`);
    const lead = await prisma_1.prisma.lead.update({
        where: { id: leadId },
        data: {
            emailsSent: { increment: 1 },
            lastEventType: "email_sent",
            lastEventAt: new Date(),
        },
    });
    return (0, prismaMappers_1.toLeadDto)(lead);
}
