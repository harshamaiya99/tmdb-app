import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { clearRequestCache } from '@/lib/requestCache';
import { tmdbService, type TMDBAccount } from '@/lib/tmdb';

const SESSION_STORAGE_KEY = 'tmdb_account_session_id';
const ACCOUNT_ID_STORAGE_KEY = 'tmdb_account_id';
const ACCOUNT_NAME_STORAGE_KEY = 'tmdb_account_name';
const ACCOUNT_USERNAME_STORAGE_KEY = 'tmdb_account_username';
const ACCOUNT_AVATAR_PATH_STORAGE_KEY = 'tmdb_account_avatar_path';
const LIST_APP_ACCESS_TOKEN_STORAGE_KEY = 'tmdb_v4_access_token';
const REQUEST_TOKEN_STORAGE_KEY = 'tmdb_account_request_token';
const LIST_ACCESS_TOKEN_STORAGE_KEY = 'tmdb_list_access_token';
const LIST_ACCOUNT_ID_STORAGE_KEY = 'tmdb_list_account_id';
const LIST_REQUEST_TOKEN_STORAGE_KEY = 'tmdb_list_request_token';

interface AccountSession {
  sessionId: string;
  account: TMDBAccount;
}

interface ListAccountSession {
  accessToken: string;
  accountId: string;
}

interface TMDBAccountContextValue {
  account: TMDBAccount | null;
  sessionId: string;
  isConnected: boolean;
  listAccessToken: string;
  listAccountId: string;
  isListAccountConnected: boolean;
  canConnectLists: boolean;
  configureV4AccessToken: (token: string) => void;
  connectAccount: () => Promise<void>;
  completeAuthorization: (requestToken: string) => Promise<void>;
  disconnectAccount: () => Promise<void>;
  connectListsAccount: () => Promise<void>;
  completeListsAuthorization: (requestToken: string) => Promise<void>;
  disconnectListsAccount: () => Promise<void>;
}

const TMDBAccountContext = createContext<TMDBAccountContextValue | null>(null);

function readSavedSession(): AccountSession | null {
  const sessionId = localStorage.getItem(SESSION_STORAGE_KEY);
  const id = Number(localStorage.getItem(ACCOUNT_ID_STORAGE_KEY));
  const name = localStorage.getItem(ACCOUNT_NAME_STORAGE_KEY) ?? '';
  const username = localStorage.getItem(ACCOUNT_USERNAME_STORAGE_KEY) ?? '';
  const avatarPath = localStorage.getItem(ACCOUNT_AVATAR_PATH_STORAGE_KEY);

  if (!sessionId || !Number.isSafeInteger(id) || id <= 0 || !username) return null;
  return {
    sessionId,
    account: {
      id,
      name,
      username,
      ...(avatarPath ? { avatar: { tmdb: { avatar_path: avatarPath } } } : {}),
    },
  };
}

function saveSession(session: AccountSession) {
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, session.sessionId);
    localStorage.setItem(ACCOUNT_ID_STORAGE_KEY, String(session.account.id));
    localStorage.setItem(ACCOUNT_NAME_STORAGE_KEY, session.account.name);
    localStorage.setItem(ACCOUNT_USERNAME_STORAGE_KEY, session.account.username);
    const avatarPath = session.account.avatar?.tmdb?.avatar_path;
    if (avatarPath) {
      localStorage.setItem(ACCOUNT_AVATAR_PATH_STORAGE_KEY, avatarPath);
    } else {
      localStorage.removeItem(ACCOUNT_AVATAR_PATH_STORAGE_KEY);
    }
  } catch (error) {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    localStorage.removeItem(ACCOUNT_ID_STORAGE_KEY);
    localStorage.removeItem(ACCOUNT_NAME_STORAGE_KEY);
    localStorage.removeItem(ACCOUNT_USERNAME_STORAGE_KEY);
    localStorage.removeItem(ACCOUNT_AVATAR_PATH_STORAGE_KEY);
    throw error;
  }
}

function clearSavedSession() {
  localStorage.removeItem(SESSION_STORAGE_KEY);
  localStorage.removeItem(ACCOUNT_ID_STORAGE_KEY);
  localStorage.removeItem(ACCOUNT_NAME_STORAGE_KEY);
  localStorage.removeItem(ACCOUNT_USERNAME_STORAGE_KEY);
  localStorage.removeItem(ACCOUNT_AVATAR_PATH_STORAGE_KEY);
}

function readSavedListSession(): ListAccountSession | null {
  const accessToken = localStorage.getItem(LIST_ACCESS_TOKEN_STORAGE_KEY);
  const accountId = localStorage.getItem(LIST_ACCOUNT_ID_STORAGE_KEY);
  return accessToken && accountId ? { accessToken, accountId } : null;
}

function saveListSession(session: ListAccountSession) {
  try {
    localStorage.setItem(LIST_ACCESS_TOKEN_STORAGE_KEY, session.accessToken);
    localStorage.setItem(LIST_ACCOUNT_ID_STORAGE_KEY, session.accountId);
  } catch (error) {
    localStorage.removeItem(LIST_ACCESS_TOKEN_STORAGE_KEY);
    localStorage.removeItem(LIST_ACCOUNT_ID_STORAGE_KEY);
    throw error;
  }
}

function clearSavedListSession() {
  localStorage.removeItem(LIST_ACCESS_TOKEN_STORAGE_KEY);
  localStorage.removeItem(LIST_ACCOUNT_ID_STORAGE_KEY);
}

export function TMDBAccountProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AccountSession | null>(readSavedSession);
  const [listSession, setListSession] = useState<ListAccountSession | null>(readSavedListSession);
  const [canConnectLists, setCanConnectLists] = useState(() => {
    const savedToken = localStorage.getItem(LIST_APP_ACCESS_TOKEN_STORAGE_KEY) ?? '';
    if (savedToken) tmdbService.setAccessToken(savedToken);
    return tmdbService.hasV4AppAccessToken();
  });
  const authorizationRequests = useRef(new Map<string, Promise<void>>());
  const listAuthorizationRequests = useRef(new Map<string, Promise<void>>());

  const configureV4AccessToken = useCallback((token: string) => {
    tmdbService.setAccessToken(token);
    setCanConnectLists(tmdbService.hasV4AppAccessToken());
  }, []);

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

  const connectListsAccount = useCallback(async () => {
    const callbackUrl = `${window.location.origin}${window.location.pathname}#/account/callback?flow=lists`;
    const requestToken = await tmdbService.createV4RequestToken(callbackUrl);
    sessionStorage.setItem(LIST_REQUEST_TOKEN_STORAGE_KEY, requestToken);

    const authorizationUrl = new URL('https://www.themoviedb.org/auth/access');
    authorizationUrl.searchParams.set('request_token', requestToken);
    window.location.assign(authorizationUrl.toString());
  }, []);

  const completeListsAuthorization = useCallback((requestToken: string) => {
    const existingRequest = listAuthorizationRequests.current.get(requestToken);
    if (existingRequest) return existingRequest;

    const request = (async () => {
      const pendingToken = sessionStorage.getItem(LIST_REQUEST_TOKEN_STORAGE_KEY);
      if (!pendingToken || pendingToken !== requestToken) {
        throw new Error('The TMDB list authorization request is missing or expired. Please try connecting again.');
      }

      const authorization = await tmdbService.createV4UserAccessToken(requestToken);
      const nextSession = { accessToken: authorization.accessToken, accountId: authorization.accountId };
      saveListSession(nextSession);
      sessionStorage.removeItem(LIST_REQUEST_TOKEN_STORAGE_KEY);
      setListSession(nextSession);
      clearRequestCache('account:');
    })();

    listAuthorizationRequests.current.set(requestToken, request);
    void request.catch(() => listAuthorizationRequests.current.delete(requestToken));
    return request;
  }, []);

  const disconnectListsAccount = useCallback(async () => {
    if (!listSession) return;
    try {
      await tmdbService.revokeV4UserAccessToken(listSession.accessToken);
    } finally {
      clearSavedListSession();
      sessionStorage.removeItem(LIST_REQUEST_TOKEN_STORAGE_KEY);
      setListSession(null);
      clearRequestCache('account:');
    }
  }, [listSession]);

  const value = useMemo<TMDBAccountContextValue>(() => ({
    sessionId: session?.sessionId ?? '',
    account: session?.account ?? null,
    isConnected: Boolean(session),
    listAccessToken: listSession?.accessToken ?? '',
    listAccountId: listSession?.accountId ?? '',
    isListAccountConnected: Boolean(listSession),
    canConnectLists,
    configureV4AccessToken,
    connectAccount,
    completeAuthorization,
    disconnectAccount,
    connectListsAccount,
    completeListsAuthorization,
    disconnectListsAccount,
  }), [
    session,
    listSession,
    canConnectLists,
    configureV4AccessToken,
    connectAccount,
    completeAuthorization,
    disconnectAccount,
    connectListsAccount,
    completeListsAuthorization,
    disconnectListsAccount,
  ]);

  return <TMDBAccountContext.Provider value={value}>{children}</TMDBAccountContext.Provider>;
}

export function useTMDBAccount() {
  const context = useContext(TMDBAccountContext);
  if (!context) throw new Error('useTMDBAccount must be used within TMDBAccountProvider');
  return context;
}
