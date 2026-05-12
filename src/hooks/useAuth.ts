import { useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

const TOKEN_KEY         = 'gcal_provider_token';
const EXPIRY_KEY        = 'gcal_provider_token_expiry';
const REFRESH_TOKEN_KEY = 'gcal_provider_refresh_token';
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
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(EXPIRY_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

async function refreshAccessToken(supabaseJwt: string): Promise<string | null> {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!refreshToken) return null;
  try {
    const res = await fetch(EDGE_FN_URL, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${supabaseJwt}`,
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) return null;
    const { access_token } = await res.json();
    if (access_token) {
      cacheTokens(access_token);
      return access_token;
    }
  } catch { /* network error — silent */ }
  return null;
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [providerToken, setProviderToken] = useState<string | null>(() => readCachedToken());
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function scheduleRefresh(supabaseJwt: string) {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    // refresh 5 minutes before expiry
    const expiry = Number(localStorage.getItem(EXPIRY_KEY) ?? 0);
    const delay  = Math.max(0, expiry - Date.now() - 5 * 60 * 1000);
    refreshTimerRef.current = setTimeout(async () => {
      const newToken = await refreshAccessToken(supabaseJwt);
      if (newToken) {
        setProviderToken(newToken);
        scheduleRefresh(supabaseJwt);
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
        scheduleRefresh(s.access_token);
      } else if (s?.access_token) {
        const cached = readCachedToken();
        if (cached) {
          scheduleRefresh(s.access_token);
        } else if (localStorage.getItem(REFRESH_TOKEN_KEY)) {
          // token expired on page load but refresh_token exists — renew immediately
          refreshAccessToken(s.access_token).then(newToken => {
            if (newToken) {
              setProviderToken(newToken);
              scheduleRefresh(s.access_token);
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
        if (s.access_token) scheduleRefresh(s.access_token);
      }
      if (evt === 'SIGNED_OUT') {
        clearTokens();
        setProviderToken(null);
        if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      }
    });

    return () => {
      sub.subscription.unsubscribe();
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { session, loading, providerToken };
}
