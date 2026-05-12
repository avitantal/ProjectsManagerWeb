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

// singleton — prevents duplicate concurrent refresh calls
let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = doRefresh().finally(() => { refreshInFlight = null; });
  return refreshInFlight;
}

async function doRefresh(): Promise<string | null> {
  const googleRefreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!googleRefreshToken) return null;

  const callEdgeFn = (jwt: string) => fetch(EDGE_FN_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${jwt}` },
    body:    JSON.stringify({ refresh_token: googleRefreshToken }),
  });

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return null;

    let res = await callEdgeFn(session.access_token);

    if (res.status === 401) {
      // Supabase JWT was mid-rotation — force a fresh one and retry once
      const { data: { session: fresh } } = await supabase.auth.refreshSession();
      if (!fresh?.access_token) return null;
      res = await callEdgeFn(fresh.access_token);
    }

    if (!res.ok) {
      if (res.status === 400 || res.status === 401) {
        // Bad or revoked refresh token — clear it to stop retrying
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        const body = await res.json().catch(() => ({}));
        console.warn('GCal refresh token rejected by server:', body);
      }
      return null;
    }
    const { access_token } = await res.json();
    if (access_token) { cacheTokens(access_token); return access_token; }
  } catch { /* network error — silent */ }
  return null;
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

  function scheduleRefresh() {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    const expiry = Number(localStorage.getItem(EXPIRY_KEY) ?? 0);
    const delay  = Math.max(0, expiry - Date.now() - 5 * 60 * 1000);
    refreshTimerRef.current = setTimeout(async () => {
      const newToken = await refreshAccessToken();
      if (newToken) {
        setProviderToken(newToken);
        scheduleRefresh();
      } else {
        clearProviderToken();
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
          refreshAccessToken().then(newToken => {
            if (newToken) {
              setProviderToken(newToken);
              scheduleRefresh();
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
