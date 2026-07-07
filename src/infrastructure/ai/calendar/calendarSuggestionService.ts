import { generateId } from '../../../lib/utils';
import type { ICalendarSuggestionService } from '../../../domain/ai/services';
import type { RecommendationInput, SuggestedCalendarEvent } from '../../../domain/ai/IntakeRecommendations';

function toIsoDate(raw?: string): string | undefined {
  if (!raw) return undefined;
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

export class CalendarSuggestionService implements ICalendarSuggestionService {
  suggestEvents(input: RecommendationInput): SuggestedCalendarEvent[] {
    const { fields, documentType } = input;
    const events: SuggestedCalendarEvent[] = [];

    const interview = toIsoDate(fields.interviewDate?.value);
    if (interview || documentType === 'Interview Notice') {
      events.push({
        id: generateId(),
        title: 'USCIS Interview',
        type: 'Interview',
        start: interview ?? new Date(Date.now() + 14 * 86400000).toISOString(),
        location: fields.office?.value,
        notes: 'Generated from AI intake — confirm date with client.',
        selected: Boolean(interview),
      });
    }

    const bio = toIsoDate(fields.biometricsDate?.value);
    if (bio || documentType === 'Biometrics Notice') {
      events.push({
        id: generateId(),
        title: 'Biometrics Appointment',
        type: 'Biometrics',
        start: bio ?? new Date(Date.now() + 7 * 86400000).toISOString(),
        location: fields.office?.value,
        selected: Boolean(bio),
      });
    }

    if (documentType === 'RFE') {
      events.push({
        id: generateId(),
        title: 'RFE Response Planning Meeting',
        type: 'Client Meeting',
        start: new Date(Date.now() + 3 * 86400000).toISOString(),
        notes: 'Discuss evidence needed for RFE response.',
        selected: true,
      });
    }

    return events;
  }
}

export const calendarSuggestionService = new CalendarSuggestionService();
