export const calendarConfig = {
  googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '',
  googleScopes: 'https://www.googleapis.com/auth/calendar.readonly',
  calendarApiBase: 'https://www.googleapis.com/calendar/v3',
  gsiScriptUrl: 'https://accounts.google.com/gsi/client',
} as const;

export function isGoogleCalendarConfigured(): boolean {
  return Boolean(calendarConfig.googleClientId.trim());
}
