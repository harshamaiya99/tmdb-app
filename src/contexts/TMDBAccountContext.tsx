import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { clearRequestCache } from '@/lib/requestCache';
import { tmdbService, type TMDBAccount } from '@/lib/tmdb';

const SESSION_STORAGE_KEY = 'tmdb_account_session_id';
const ACCOUNT_ID_STORAGE_KEY = 'tmdb_account_id';
const ACCOUNT_NAME_STORAGE_KEY = 'tmdb_account_name';
const ACCOUNT_USERNAME_STORAGE_KEY = 'tmdb_account_username';
const REQUEST_TOKEN_STORAGE_KEY = 'tmdb_account_request_token';

interface AccountSession {
  sessionId: string;
  account: TMDBAccount;
}

interface TMDBAccountContextValue {
  account: TMDBAccount | null;
  sessionId: string;
  isConnected: boolean;
  connectAccount: () => Promise<void>;
  completeAuthorization: (requestToken: string) => Promise<void>;
  disconnectAccount: () => Promise<void>;
}

const TMDBAccountContext = createContext<TMDBAccountContextValue | null>(null);

function readSavedSession(): AccountSession | null {
  const sessionId = localStorage.getItem(SESSION_STORAGE_KEY);
  const id = Number(localStorage.getItem(ACCOUNT_ID_STORAGE_KEY));
  const name = localStorage.getItem(ACCOUNT_NAME_STORAGE_KEY) ?? '';
  const username = localStorage.getItem(ACCOUNT_USERNAME_STORAGE_KEY) ?? '';

  if (!sessionId || !Number.isSafeInteger(id) || id <= 0 || !username) return null;
  return { sessionId, account: { id, name, username } };
}

function saveSession(session: AccountSession) {
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, session.sessionId);
    localStorage.setItem(ACCOUNT_ID_STORAGE_KEY, String(session.account.id));
    localStorage.setItem(ACCOUNT_NAME_STORAGE_KEY, session.account.name);
    localStorage.setItem(ACCOUNT_USERNAME_STORAGE_KEY, session.account.username);
  } catch (error) {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    localStorage.removeItem(ACCOUNT_ID_STORAGE_KEY);
    localStorage.removeItem(ACCOUNT_NAME_STORAGE_KEY);
    localStorage.removeItem(ACCOUNT_USERNAME_STORAGE_KEY);
    throw error;
  }
}

function clearSavedSession() {
  localStorage.removeItem(SESSION_STORAGE_KEY);
  localStorage.removeItem(ACCOUNT_ID_STORAGE_KEY);
  localStorage.removeItem(ACCOUNT_NAME_STORAGE_KEY);
  localStorage.removeItem(ACCOUNT_USERNAME_STORAGE_KEY);
}

export function TMDBAccountProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AccountSession | null>(readSavedSession);
  const authorizationRequests = useRef(new Map<string, Promise<void>>());

  const connectAccount = useCallback(async () => {
    const requestToken = await tmdbService.createAccountRequestToken();
    sessionStorage.setItem(REQUEST_TOKEN_STORAGE_KEY, requestToken);

    const callbackUrl = `${window.location.origin}${window.location.pathname}#/account/callback`;
    const authorizationUrl = new URL(`https://www.themoviedb.org/authenticate/${encodeURIComponent(requestToken)}`);
    authorizationUrl.searchParams.set('redirect_to', callbackUrl);
    window.location.assign(authorizationUrl.toString());
  }, []);

  const completeAuthorization = useCallback((requestToken: string) => {
    const existingRequest = authorizationRequests.current.get(requestToken);
    if (existingRequest) return existingRequest;

    const request = (async () => {
      const pendingToken = sessionStorage.getItem(REQUEST_TOKEN_STORAGE_KEY);
      if (!pendingToken || pendingToken !== requestToken) {
        throw new Error('The TMDB authorization request is missing or expired. Please try connecting again.');
      }

      const sessionId = await tmdbService.createAccountSession(requestToken);
      const account = await tmdbService.getCurrentAccount(sessionId);
      const nextSession = { sessionId, account };
      saveSession(nextSession);
      sessionStorage.removeItem(REQUEST_TOKEN_STORAGE_KEY);
      setSession(nextSession);
      clearRequestCache('account:');
    })();

    authorizationRequests.current.set(requestToken, request);
    void request.catch(() => authorizationRequests.current.delete(requestToken));
    return request;
  }, []);

  const disconnectAccount = useCallback(async () => {
    if (!session) return;
    try {
      await tmdbService.deleteAccountSession(session.sessionId);
    } finally {
      clearSavedSession();
      sessionStorage.removeItem(REQUEST_TOKEN_STORAGE_KEY);
      setSession(null);
      clearRequestCache('account:');
    }
  }, [session]);

  const value = useMemo<TMDBAccountContextValue>(() => ({
    sessionId: session?.sessionId ?? '',
    account: session?.account ?? null,
    isConnected: Boolean(session),
    connectAccount,
    completeAuthorization,
    disconnectAccount,
  }), [session, connectAccount, completeAuthorization, disconnectAccount]);

  return <TMDBAccountContext.Provider value={value}>{children}</TMDBAccountContext.Provider>;
}

export function useTMDBAccount() {
  const context = useContext(TMDBAccountContext);
  if (!context) throw new Error('useTMDBAccount must be used within TMDBAccountProvider');
  return context;
}
