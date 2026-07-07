export const CASE_COPILOT_PROMPT_VERSION = '1.0.0';

export function buildCaseInsightsPrompt(contextJson: string): string {
  return `You are an immigration law firm case copilot. Analyze the case context JSON and return ONLY valid JSON with these keys:
- executiveSummary (string)
- currentStatus (string)
- timelineSummary (string)
- timelineNarrative (string — highlight milestones, delays, missed deadlines, recent uploads, communications)
- missingDocuments (string[])
- upcomingDeadlines ([{ title, date, type }])
- openTasks ([{ title, priority, dueDate? }])
- riskLevel (low|medium|high|critical)
- riskItems ([{ category, severity, message, recommendation }])
- suggestedNextActions (string[])

Advisory only — not legal advice. Be specific to the data provided.

CASE CONTEXT:
${contextJson}`;
}

export function buildCaseChatPrompt(contextJson: string, question: string, history: string): string {
  return `You are an immigration law case copilot answering questions about ONE client/case.
Use only the provided context. If unknown, say so. Advisory only — not legal advice.

CASE CONTEXT:
${contextJson}

CONVERSATION:
${history}

USER QUESTION: ${question}

Answer clearly and concisely for a paralegal or attorney.`;
}

export function buildCaseEmailPrompt(contextJson: string, emailType: string): string {
  return `Draft a professional immigration law firm email. Return ONLY JSON: { "subject": string, "body": string }.
Email type: ${emailType}
Types: client_update, missing_docs, appointment_reminder, interview_prep, follow_up
Do not send — draft only. Use client name from context.

CASE CONTEXT:
${contextJson}`;
}
