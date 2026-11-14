import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { invalidateAccountCache } from '@/lib/accountCache';
import type { TMDBAccount } from '@/lib/tmdb';

interface AccountSessionResponse {
  isConnected: boolean;
  account: TMDBAccount | null;
  isListAccountConnected: boolean;
  listAccountId: string;
  canConnectLists: boolean;
}

interface TMDBAccountContextValue extends AccountSessionResponse {
  sessionLoading: boolean;
  sessionError: string | null;
  connectTMDBAccount: () => Promise<void>;
  connectAccount: () => Promise<void>;
  disconnectTMDBAccount: () => Promise<void>;
  disconnectAccount: () => Promise<void>;
  connectListsAccount: () => Promise<void>;
  disconnectListsAccount: () => Promise<void>;
}

const TMDBAccountContext = createContext<TMDBAccountContextValue | null>(null);

const EMPTY_SESSION: AccountSessionResponse = {
  isConnected: false,
  account: null,
  isListAccountConnected: false,
  listAccountId: '',
  canConnectLists: false,
};

async function postAccountLogout(): Promise<void> {
  const response = await fetch('/api/account/logout', {
    method: 'POST',
    credentials: 'same-origin',
  });
  if (!response.ok) {
    let message = `Could not disconnect the TMDB account (${response.status})`;
    try {
      const body = await response.json() as { error?: string };
      if (body.error) message = body.error;
    } catch {
      // Keep the HTTP status when the account service does not return JSON.
    }
    throw new Error(message);
  }
}

export function TMDBAccountProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AccountSessionResponse>(EMPTY_SESSION);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);

  const refreshSession = useCallback(async () => {
    setSessionLoading(true);
    setSessionError(null);
    let legacyCredentialError: string | null = null;
    try {
      const legacyCredentialKeys = [
        'tmdb_account_session_id',
        'tmdb_account_id',
        'tmdb_account_name',
        'tmdb_account_username',
        'tmdb_account_avatar_path',
        'tmdb_v4_access_token',
        'tmdb_list_access_token',
        'tmdb_list_account_id',
        'tmdb_account_request_token',
        'tmdb_list_request_token',
        'tmdb_combined_auth_pending',
      ];
      if (!import.meta.env.DEV) legacyCredentialKeys.push('tmdb_api_key');
      legacyCredentialKeys.forEach((key) => localStorage.removeItem(key));
    } catch {
      legacyCredentialError = 'Could not clear previous TMDB account credentials from this browser.';
    }

    try {
      const response = await fetch('/api/account/session', {
        credentials: 'same-origin',
        cache: 'no-store',
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({})) as { error?: string };
        throw new Error(body.error || `Could not load TMDB account status (${response.status})`);
      }
      setSession({ ...EMPTY_SESSION, ...await response.json() as AccountSessionResponse });
      setSessionError(legacyCredentialError);
    } catch (error) {
      setSession(EMPTY_SESSION);
      setSessionError(error instanceof Error ? error.message : 'Could not load TMDB account status.');
    } finally {
      setSessionLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  const connectAccount = useCallback(async () => {
    if (session.isConnected) {
      throw new Error('You are already connected to a TMDB account. Disconnect it before switching accounts.');
    }
    window.location.assign('/api/account/auth/start?flow=v3');
  }, [session.isConnected]);

  const connectListsAccount = useCallback(async () => {
    window.location.assign('/api/account/auth/start?flow=v4');
  }, []);

  const connectTMDBAccount = useCallback(async () => {
    if (!session.isConnected) {
      await connectAccount();
    } else if (!session.isListAccountConnected) {
      if (!session.canConnectLists) {
        throw new Error('Custom-list authorization is not configured for this application.');
      }
      await connectListsAccount();
    }
  }, [session, connectAccount, connectListsAccount]);

  const disconnectTMDBAccount = useCallback(async () => {
    try {
      await postAccountLogout();
      setSession(EMPTY_SESSION);
      setSessionError(null);
      invalidateAccountCache();
    } catch (error) {
      await refreshSession();
      throw error;
    }
  }, [refreshSession]);

  const value = useMemo<TMDBAccountContextValue>(() => ({
    ...session,
    sessionLoading,
    sessionError,
    connectTMDBAccount,
    connectAccount,
    disconnectTMDBAccount,
    disconnectAccount: disconnectTMDBAccount,
    connectListsAccount,
    disconnectListsAccount: disconnectTMDBAccount,
  }), [
    session,
    sessionLoading,
    sessionError,
    connectTMDBAccount,
    connectAccount,
    disconnectTMDBAccount,
    connectListsAccount,
  ]);

  return <TMDBAccountContext.Provider value={value}>{children}</TMDBAccountContext.Provider>;
}

export function useTMDBAccount() {
  const context = useContext(TMDBAccountContext);
  if (!context) throw new Error('useTMDBAccount must be used within TMDBAccountProvider');
  return context;
}
