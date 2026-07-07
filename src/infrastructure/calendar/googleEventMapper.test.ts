import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mapGoogleEvent, parseGoogleDate } from './googleEventMapper.ts';

describe('parseGoogleDate', () => {
  it('parses all-day dates', () => {
    const { date, allDay } = parseGoogleDate({ date: '2026-07-15' });
    assert.equal(allDay, true);
    assert.equal(date.getFullYear(), 2026);
    assert.equal(date.getMonth(), 6);
    assert.equal(date.getDate(), 15);
  });

  it('parses dateTime values', () => {
    const { date, allDay, timezone } = parseGoogleDate({
      dateTime: '2026-07-15T14:30:00-04:00',
      timeZone: 'America/New_York',
    });
    assert.equal(allDay, false);
    assert.equal(timezone, 'America/New_York');
    assert.ok(date instanceof Date);
  });
});

describe('mapGoogleEvent', () => {
  it('maps a Google event with attendees', () => {
    const mapped = mapGoogleEvent(
      {
        id: 'evt1',
        summary: 'Client Consultation',
        description: 'Initial meeting',
        location: 'Main Office',
        start: { dateTime: '2026-07-15T10:00:00-04:00' },
        end: { dateTime: '2026-07-15T11:00:00-04:00' },
        attendees: [{ email: 'client@example.com', displayName: 'Jane Client' }],
        organizer: { displayName: 'Attorney Smith' },
        status: 'confirmed',
      },
      'tenant-1',
      'cal-primary',
      'Work Calendar',
      '#039BE5',
    );
    assert.ok(mapped);
    assert.equal(mapped!.title, 'Client Consultation');
    assert.equal(mapped!.provider, 'google');
    assert.equal(mapped!.location, 'Main Office');
    assert.deepEqual(mapped!.attendees, ['Jane Client']);
    assert.equal(mapped!.organizer, 'Attorney Smith');
  });

  it('returns null for cancelled events', () => {
    const mapped = mapGoogleEvent(
      { id: 'evt2', status: 'cancelled', summary: 'Cancelled' },
      'tenant-1',
      'cal-primary',
      'Work Calendar',
    );
    assert.equal(mapped, null);
  });
});
