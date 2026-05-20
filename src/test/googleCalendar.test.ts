import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  GoogleCalendarError,
  isGoogleCalendarAuthError,
  isGoogleCalendarConfigurationError,
  listCalendars,
} from '../lib/googleCalendar';

function googleError(status: number, reason: string, message: string) {
  return new Response(JSON.stringify({
    error: {
      code: status,
      message,
      errors: [{ reason, message }],
    },
  }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function captureListError(response: Response): Promise<unknown> {
  vi.stubGlobal('fetch', vi.fn(async () => response));

  try {
    await listCalendars('token');
  } catch (err) {
    return err;
  }

  throw new Error('Expected listCalendars to throw');
}

describe('Google Calendar errors', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('classifies insufficient calendar scope as an auth error', async () => {
    const err = await captureListError(googleError(
      403,
      'insufficientPermissions',
      'Request had insufficient authentication scopes.',
    ));

    expect(err).toBeInstanceOf(GoogleCalendarError);
    expect(isGoogleCalendarAuthError(err)).toBe(true);
    expect(isGoogleCalendarConfigurationError(err)).toBe(false);
  });

  it('classifies a disabled Calendar API as configuration, not reauth', async () => {
    const err = await captureListError(googleError(
      403,
      'accessNotConfigured',
      'Google Calendar API has not been used in project before or it is disabled.',
    ));

    expect(err).toBeInstanceOf(GoogleCalendarError);
    expect(isGoogleCalendarAuthError(err)).toBe(false);
    expect(isGoogleCalendarConfigurationError(err)).toBe(true);
  });

  it('does not treat quota errors as auth failures', async () => {
    const err = await captureListError(googleError(
      403,
      'rateLimitExceeded',
      'Rate Limit Exceeded',
    ));

    expect(err).toBeInstanceOf(GoogleCalendarError);
    expect(isGoogleCalendarAuthError(err)).toBe(false);
    expect(isGoogleCalendarConfigurationError(err)).toBe(false);
  });

  it('lists only calendars the user can write to', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      items: [
        { id: 'primary', summary: 'Main', accessRole: 'owner' },
        { id: 'team', summary: 'Team', accessRole: 'writer' },
        { id: 'holidays', summary: 'Holidays', accessRole: 'reader' },
      ],
    }), { status: 200 })));

    await expect(listCalendars('token')).resolves.toEqual([
      { id: 'primary', summary: 'Main' },
      { id: 'team', summary: 'Team' },
    ]);
  });
});
