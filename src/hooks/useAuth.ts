import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

const TOKEN_KEY    = 'gcal_provider_token';
const EXPIRY_KEY   = 'gcal_provider_token_expiry';
const TTL_MS       = 55 * 60 * 1000; // 55 minutes (token lasts ~60 min)

function readCachedToken(): string | null {
  const token  = localStorage.getItem(TOKEN_KEY);
  const expiry = Number(localStorage.getItem(EXPIRY_KEY) ?? 0);
  if (token && Date.now() < expiry) return token;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(EXPIRY_KEY);
  return null;
}

function cacheToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(EXPIRY_KEY, String(Date.now() + TTL_MS));
}

function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(EXPIRY_KEY);
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [providerToken, setProviderToken] = useState<string | null>(() => readCachedToken());

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.provider_token) {
        cacheToken(data.session.provider_token);
        setProviderToken(data.session.provider_token);
      }
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((evt, s) => {
      setSession(s);
      if (s?.provider_token) {
        cacheToken(s.provider_token);
        setProviderToken(s.provider_token);
      }
      if (evt === 'SIGNED_OUT') {
        clearToken();
        setProviderToken(null);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  return { session, loading, providerToken };
}
