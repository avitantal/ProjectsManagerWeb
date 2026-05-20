import { useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import {
  clearGoogleCalendarTokenCache,
  GCAL_PROVIDER_REFRESH_TOKEN_KEY,
  GCAL_PROVIDER_TOKEN_EXPIRY_KEY,
  GCAL_PROVIDER_TOKEN_KEY,
} from '../lib/googleAuth';

const TOKEN_KEY         = GCAL_PROVIDER_TOKEN_KEY;
const EXPIRY_KEY        = GCAL_PROVIDER_TOKEN_EXPIRY_KEY;
const REFRESH_TOKEN_KEY = GCAL_PROVIDER_REFRESH_TOKEN_KEY;
const TTL_MS            = 55 * 60 * 1000; // 55 min — refresh before the 60 min Google expiry
const RETRY_DELAYS_MS   = [60_000, 120_000, 300_000]; // backoff after a transient refresh failure: 1m, 2m, 5m

const EDGE_FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/refresh-gcal-token`;

function readCachedToken(): string | null {
  const token  = localStorage.getItem(TOKEN_KEY);
  const expiry = Number(localStorage.getItem(EXPIRY_KEY) ?? 0);
  if (token && Date.now() < expiry) return token;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(EXPIRY_KEY);
  return null;
}

function cacheTokens(accessToken: string, refreshToken?: string | null) {
  localStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem(EXPIRY_KEY, String(Date.now() + TTL_MS));
  if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

function clearTokens() {
  clearGoogleCalendarTokenCache();
}

// Result of a refresh attempt. A `transient` failure (network, 5xx, server
// misconfiguration) keeps the connection alive and retries; only a genuinely
// revoked Google refresh token (`revoked: true`) disconnects the user.
type RefreshOutcome =
  | { ok: true; token: string }
  | { ok: false; revoked: boolean };

// singleton — prevents duplicate concurrent refresh calls
let refreshInFlight: Promise<RefreshOutcome> | null = null;

async function refreshAccessToken(): Promise<RefreshOutcome> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = doRefresh().finally(() => { refreshInFlight = null; });
  return refreshInFlight;
}

async function doRefresh(): Promise<RefreshOutcome> {
  const googleRefreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!googleRefreshToken) return { ok: false, revoked: true };

  try {
    const { data: { session } } = await supabase.auth.getSession();
    // No Supabase session right now — transient, don't drop the connection.
    if (!session?.access_token) return { ok: false, revoked: false };

    const res = await fetch(EDGE_FN_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
      body:    JSON.stringify({ refresh_token: googleRefreshToken }),
    });

    if (res.ok) {
      const { access_token } = await res.json().catch(() => ({}));
      if (access_token) { cacheTokens(access_token); return { ok: true, token: access_token }; }
      // 2xx without a token — unexpected; retry rather than disconnect.
      return { ok: false, revoked: false };
    }

    // Non-2xx. Only `invalid_grant` means the refresh token itself is dead.
    // Everything else (401 invalid_client, 403, 5xx, …) is a server-side or
    // transient problem — keep the token and retry.
    const body = await res.json().catch(() => ({}));
    const revoked = body?.error === 'invalid_grant';
    if (revoked) {
      console.warn('GCal refresh token revoked by Google — reconnect required:', body);
    } else {
      console.warn('GCal token refresh failed (transient), will retry:', res.status, body);
    }
    return { ok: false, revoked };
  } catch (err) {
    // Network error — transient, keep the connection and retry.
    console.warn('GCal token refresh network error, will retry:', err);
    return { ok: false, revoked: false };
  }
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [providerToken, setProviderToken] = useState<string | null>(() => readCachedToken());
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearProviderToken() {
    clearTokens();
    setProviderToken(null);
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
  }

  // retryAttempt 0 = normal schedule (refresh ~5 min before token expiry).
  // retryAttempt > 0 = backoff after a transient failure (1m, 2m, then 5m).
  function scheduleRefresh(retryAttempt = 0) {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    let delay: number;
    if (retryAttempt > 0) {
      delay = RETRY_DELAYS_MS[Math.min(retryAttempt - 1, RETRY_DELAYS_MS.length - 1)];
    } else {
      const expiry = Number(localStorage.getItem(EXPIRY_KEY) ?? 0);
      delay = Math.max(0, expiry - Date.now() - 5 * 60 * 1000);
    }
    refreshTimerRef.current = setTimeout(async () => {
      const result = await refreshAccessToken();
      if (result.ok) {
        setProviderToken(result.token);
        scheduleRefresh();
      } else if (result.revoked) {
        // The Google refresh token is dead — a genuine disconnect.
        clearProviderToken();
      } else {
        // Transient failure — keep the connection and retry with backoff.
        scheduleRefresh(retryAttempt + 1);
      }
    }, delay);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const s = data.session;
      setSession(s);
      if (s?.provider_token) {
        cacheTokens(s.provider_token, s.provider_refresh_token);
        setProviderToken(s.provider_token);
        scheduleRefresh();
      } else if (s?.access_token) {
        const cached = readCachedToken();
        if (cached) {
          scheduleRefresh();
        } else if (localStorage.getItem(REFRESH_TOKEN_KEY)) {
          refreshAccessToken().then(result => {
            if (result.ok) {
              setProviderToken(result.token);
              scheduleRefresh();
            } else if (result.revoked) {
              clearProviderToken();
            } else {
              // Transient failure on load — retry shortly, stay connected.
              scheduleRefresh(1);
            }
          });
        }
      }
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((evt, s) => {
      setSession(s);
      if (s?.provider_token) {
        cacheTokens(s.provider_token, s.provider_refresh_token);
        setProviderToken(s.provider_token);
        scheduleRefresh();
      }
      if (evt === 'SIGNED_OUT') {
        clearProviderToken();
      }
    });

    return () => {
      sub.subscription.unsubscribe();
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { session, loading, providerToken, clearProviderToken };
}
