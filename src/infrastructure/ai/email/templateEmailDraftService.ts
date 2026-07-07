import type { IEmailDraftService } from '../../../domain/ai/services';
import type { RecommendationInput, SuggestedEmailDraft } from '../../../domain/ai/IntakeRecommendations';

export class TemplateEmailDraftService implements IEmailDraftService {
  generateDraft(input: RecommendationInput): SuggestedEmailDraft {
    const { fields, documentType } = input;
    const name = fields.clientName?.value ?? fields.beneficiary?.value ?? 'Valued Client';
    const receipt = fields.receiptNumber?.value;

    let subject = `Update regarding your immigration document — ${documentType}`;
    let body = `Dear ${name},\n\n`;
    body += `We received and reviewed your ${documentType} document.\n\n`;

    if (receipt) {
      body += `Your USCIS receipt number is ${receipt}. We will monitor your case and keep you informed of any updates.\n\n`;
    }

    if (documentType === 'RFE') {
      subject = 'Action needed: Request for Evidence (RFE)';
      body += 'We identified a Request for Evidence that requires your attention. Our team will contact you to discuss the required documents and deadlines.\n\n';
    } else if (documentType === 'Interview Notice') {
      subject = 'Your USCIS interview has been scheduled';
      body += 'An interview date was identified in your notice. We will confirm the details and send preparation instructions shortly.\n\n';
    }

    body += 'Please reply to this email if you have any questions.\n\n';
    body += 'Sincerely,\nYour Immigration Team';

    return {
      subject,
      body,
      to: fields.email?.value,
      approved: false,
    };
  }
}

export const templateEmailDraftService = new TemplateEmailDraftService();
