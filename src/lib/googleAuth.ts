import { supabase } from './supabase';

export const GCAL_PROVIDER_TOKEN_KEY = 'gcal_provider_token';
export const GCAL_PROVIDER_TOKEN_EXPIRY_KEY = 'gcal_provider_token_expiry';
export const GCAL_PROVIDER_REFRESH_TOKEN_KEY = 'gcal_provider_refresh_token';

export const GOOGLE_CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar';

export function clearGoogleCalendarTokenCache() {
  localStorage.removeItem(GCAL_PROVIDER_TOKEN_KEY);
  localStorage.removeItem(GCAL_PROVIDER_TOKEN_EXPIRY_KEY);
  localStorage.removeItem(GCAL_PROVIDER_REFRESH_TOKEN_KEY);
}

function getRedirectTo(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.location.origin + window.location.pathname;
}

export async function signInWithGoogleCalendar(redirectTo = getRedirectTo()) {
  clearGoogleCalendarTokenCache();

  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      ...(redirectTo ? { redirectTo } : {}),
      scopes: GOOGLE_CALENDAR_SCOPE,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
        include_granted_scopes: 'true',
      },
    },
  });
}
