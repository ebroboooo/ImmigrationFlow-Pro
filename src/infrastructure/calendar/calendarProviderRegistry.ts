import type { ICalendarProvider } from '../../domain/calendar/ICalendarProvider';
import { googleCalendarProvider } from './GoogleCalendarProvider';

/** Register additional providers (Outlook, Apple) here without UI changes. */
export const calendarProviders: ICalendarProvider[] = [
  googleCalendarProvider,
];

export function getCalendarProvider(id: ICalendarProvider['id']): ICalendarProvider | undefined {
  return calendarProviders.find((p) => p.id === id);
}
