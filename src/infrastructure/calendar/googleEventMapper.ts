import type { ExternalCalendarEvent } from '../../domain/calendar/ExternalCalendarEvent';

interface GoogleDateTime {
  date?: string;
  dateTime?: string;
  timeZone?: string;
}

interface GoogleEventAttendee {
  email?: string;
  displayName?: string;
  responseStatus?: string;
}

interface GoogleApiEvent {
  id: string;
  status?: string;
  summary?: string;
  description?: string;
  location?: string;
  start?: GoogleDateTime;
  end?: GoogleDateTime;
  attendees?: GoogleEventAttendee[];
  organizer?: { email?: string; displayName?: string };
  colorId?: string;
  recurringEventId?: string;
  recurrence?: string[];
}

export function parseGoogleDate(dt?: GoogleDateTime): { date: Date; allDay: boolean; timezone?: string } {
  if (!dt) return { date: new Date(), allDay: false };
  if (dt.date) {
    const [y, m, d] = dt.date.split('-').map(Number);
    return { date: new Date(y, m - 1, d, 0, 0, 0), allDay: true, timezone: dt.timeZone };
  }
  return { date: new Date(dt.dateTime!), allDay: false, timezone: dt.timeZone };
}

export function mapGoogleEvent(
  item: GoogleApiEvent,
  tenantId: string,
  calendarId: string,
  calendarName: string,
  calendarColor?: string,
): ExternalCalendarEvent | null {
  if (!item.id || item.status === 'cancelled') return null;
  const startParsed = parseGoogleDate(item.start);
  const endParsed = parseGoogleDate(item.end);
  const attendees = item.attendees
    ?.map((a) => a.displayName || a.email)
    .filter(Boolean) as string[] | undefined;

  return {
    id: `google-${calendarId}-${item.id}`,
    tenantId,
    provider: 'google',
    calendarId,
    calendarName,
    externalId: item.id,
    title: item.summary?.trim() || '(No title)',
    description: item.description,
    location: item.location,
    start: startParsed.date,
    end: endParsed.date,
    allDay: startParsed.allDay,
    attendees,
    color: calendarColor ?? item.colorId,
    status: item.status,
    recurring: Boolean(item.recurringEventId || item.recurrence?.length),
    organizer: item.organizer?.displayName ?? item.organizer?.email,
    timezone: startParsed.timezone ?? endParsed.timezone,
    syncedAt: new Date(),
  };
}

export type { GoogleApiEvent };
