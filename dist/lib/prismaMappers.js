"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toLeadDto = toLeadDto;
exports.toCategoryDto = toCategoryDto;
exports.toLeadSnapshotDto = toLeadSnapshotDto;
function toLeadDto(lead) {
    return {
        id: lead.id,
        category_id: lead.categoryId,
        first_name: lead.firstName,
        last_name: lead.lastName,
        email: lead.email,
        company: lead.company,
        job_title: lead.jobTitle,
        phone: lead.phone,
        source: lead.source,
        initial_message: lead.initialMessage,
        business_detail: lead.businessDetail,
        score: lead.score,
        tier: lead.tier,
        emails_sent: lead.emailsSent,
        emails_opened: lead.emailsOpened,
        links_clicked: lead.linksClicked,
        replies_received: lead.repliesReceived,
        booking_clicks: lead.bookingClicks,
        last_event_at: lead.lastEventAt,
        last_event_type: lead.lastEventType,
        created_at: lead.createdAt,
        updated_at: lead.updatedAt,
    };
}
function toCategoryDto(category) {
    return {
        id: category.id,
        name: category.name,
        offering: category.offering,
        statement: category.statement,
        created_at: category.createdAt,
        updated_at: category.updatedAt,
    };
}
function toLeadSnapshotDto(snapshot) {
    return {
        id: snapshot.id,
        lead_id: snapshot.leadId,
        current_score: snapshot.currentScore,
        summary: snapshot.summary,
        current_intent: snapshot.currentIntent,
        last_meaningful_event: snapshot.lastMeaningfulEvent,
        suggested_email_subject: snapshot.suggestedEmailSubject,
        suggested_email_body: snapshot.suggestedEmailBody,
        suggested_email_sent_at: snapshot.suggestedEmailSentAt,
        llm_model: snapshot.llmModel,
        token_cost: snapshot.tokenCost,
        created_at: snapshot.createdAt,
        updated_at: snapshot.updatedAt,
    };
}
