import { generateId } from '../../../lib/utils';
import type { IRecommendationService } from '../../../domain/ai/services';
import type { IntakeRecommendations, RecommendationInput } from '../../../domain/ai/IntakeRecommendations';
import { emptyRecommendations } from '../../../domain/ai/IntakeRecommendations';
import { templateEmailDraftService } from '../email/templateEmailDraftService';
import { taskSuggestionService } from '../tasks/taskSuggestionService';
import { calendarSuggestionService } from '../calendar/calendarSuggestionService';

export class RuleBasedRecommendationService implements IRecommendationService {
  generate(input: RecommendationInput): IntakeRecommendations {
    const { fields, documentType, rawText } = input;
    const rec = emptyRecommendations();
    const name = fields.clientName?.value ?? fields.beneficiary?.value ?? 'the client';
    const form = fields.uscisForm?.value ?? documentType;

    rec.caseSummary = fields.receiptNumber?.value
      ? `${form} document for ${name}. USCIS receipt ${fields.receiptNumber.value}. Review extracted fields and confirm before creating records.`
      : `${form} document uploaded for ${name}. Pattern-based extraction completed — verify all fields before approval.`;

    rec.nextSteps = [
      'Review extracted information for accuracy',
      'Confirm document classification',
      'Select automations to run after approval',
    ];

    if (fields.receiptNumber?.value) {
      rec.nextSteps.push('Verify receipt status on the official USCIS website');
    }
    if (documentType === 'RFE') {
      rec.nextSteps.unshift('Identify RFE response deadline and required evidence');
      rec.riskIndicators.push('Request for Evidence — deadline may be time-sensitive');
    }
    if (documentType === 'Denial Notice') {
      rec.riskIndicators.push('Denial notice detected — review appeal or motion options');
    }

    if (!fields.clientName?.value) rec.missingInformation.push('Client full name');
    if (!fields.receiptNumber?.value && /uscis|receipt/i.test(rawText)) {
      rec.missingInformation.push('USCIS receipt number');
    }
    if (!fields.email?.value) rec.missingInformation.push('Client email address');

    rec.suggestedTasks = taskSuggestionService.suggestTasks(input);
    rec.suggestedCalendarEvents = calendarSuggestionService.suggestEvents(input);
    rec.suggestedDeadlines = this.suggestDeadlines(input);
    rec.suggestedEmail = templateEmailDraftService.generateDraft(input);
    rec.suggestedInternalNotes = `AI intake summary (${documentType}): ${rec.caseSummary}`;
    rec.potentialFollowUps = this.followUps(documentType);
    rec.requiredDocuments = this.requiredDocs(documentType);

    return rec;
  }

  private suggestDeadlines(input: RecommendationInput) {
    const items = [];
    const { fields, documentType } = input;
    if (documentType === 'RFE' && fields.noticeDate?.value) {
      items.push({
        id: generateId(),
        title: 'RFE Response Deadline',
        type: 'RFE Deadline',
        date: fields.noticeDate.value,
        selected: true,
      });
    }
    if (fields.biometricsDate?.value) {
      items.push({
        id: generateId(),
        title: 'Biometrics Appointment',
        type: 'Biometric Appointment',
        date: fields.biometricsDate.value,
        selected: true,
      });
    }
    if (fields.interviewDate?.value) {
      items.push({
        id: generateId(),
        title: 'USCIS Interview',
        type: 'Interview Date',
        date: fields.interviewDate.value,
        selected: true,
      });
    }
    return items;
  }

  private followUps(documentType: string): string[] {
    const map: Record<string, string[]> = {
      RFE: ['Schedule evidence collection meeting', 'Confirm mailing of RFE response'],
      'Interview Notice': ['Send interview preparation checklist to client'],
      'Receipt Notice': ['Add case to tracking dashboard', 'Confirm client contact information'],
    };
    return map[documentType] ?? ['Follow up with client to confirm receipt of notice'];
  }

  private requiredDocs(documentType: string): string[] {
    const map: Record<string, string[]> = {
      'I-485': ['Birth certificate', 'Passport biographical page', 'I-94', 'Medical exam (I-693)'],
      RFE: ['Evidence listed in RFE notice'],
      'I-130': ['Proof of relationship', 'Birth certificates', 'Marriage certificate if applicable'],
    };
    return map[documentType] ?? [];
  }
}

export const ruleBasedRecommendationService = new RuleBasedRecommendationService();
