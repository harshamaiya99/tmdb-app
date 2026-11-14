import { neon } from '@neondatabase/serverless';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';

export interface VercelRequest {
  method?: string;
  query?: Record<string, string | string[] | undefined>;
  body?: unknown;
  headers?: Record<string, string | string[] | undefined>;
}

export interface VercelResponse {
  status(code: number): VercelResponse;
  setHeader(name: string, value: string | string[]): VercelResponse;
  json(body: unknown): VercelResponse;
}

interface SessionRow {
  session_hash: string;
  tmdb_session_id_encrypted: string | null;
  tmdb_account_id: number | null;
  tmdb_account_name: string;
  tmdb_username: string;
  tmdb_avatar_path: string | null;
  tmdb_v4_access_token_encrypted: string | null;
  tmdb_v4_account_id: string | null;
}

interface OAuthStateRow {
  session_hash: string;
  flow: 'v3' | 'v4';
}

const SESSION_COOKIE = '__Host-tmdb_session';
const OAUTH_STATE_COOKIE = '__Host-tmdb_oauth_state';
const V4_REQUEST_TOKEN_COOKIE = '__Host-tmdb_v4_request_token';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const OAUTH_STATE_MAX_AGE_SECONDS = 60 * 10;

export interface AccountSession {
  sessionHash: string;
  tmdbSessionId: string | null;
  accountId: number | null;
  accountName: string;
  username: string;
  avatarPath: string | null;
  v4AccessToken: string | null;
  v4AccountId: string | null;
}

function getDatabase() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is not configured');
  return neon(connectionString);
}

function getEncryptionKey(): Buffer {
  const value = process.env.TMDB_TOKEN_ENCRYPTION_KEY;
  if (!value) throw new Error('TMDB_TOKEN_ENCRYPTION_KEY is not configured');
  const key = Buffer.from(value, 'base64');
  if (key.length !== 32) throw new Error('TMDB_TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key');
  return key;
}

export function encryptToken(value: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), ciphertext].map((part) => part.toString('base64url')).join('.');
}

export function decryptToken(value: string): string {
  const [encodedIv, encodedTag, encodedCiphertext] = value.split('.');
  if (!encodedIv || !encodedTag || !encodedCiphertext) {
    throw new Error('Stored TMDB credential has an invalid encrypted format');
  }
  const decipher = createDecipheriv(
    'aes-256-gcm',
    getEncryptionKey(),
    Buffer.from(encodedIv, 'base64url'),
  );
  decipher.setAuthTag(Buffer.from(encodedTag, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(encodedCiphertext, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

function hash(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function getHeader(request: VercelRequest, name: string): string | undefined {
  const value = request.headers?.[name] ?? request.headers?.[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

function getCookies(request: VercelRequest): Map<string, string> {
  const cookieHeader = getHeader(request, 'cookie') ?? '';
  const cookies = cookieHeader.split(';').map((part): [string, string] => {
      const separator = part.indexOf('=');
      if (separator < 0) return ['', ''];
      return [
        part.slice(0, separator).trim(),
        part.slice(separator + 1).trim(),
      ];
    }).filter(([name]) => Boolean(name));
  return new Map(cookies);
}

export function getCookie(request: VercelRequest, name: string): string | undefined {
  return getCookies(request).get(name);
}

export function newOpaqueToken(): string {
  return randomBytes(32).toString('base64url');
}

export function tokenHash(value: string): string {
  return hash(value);
}

export function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function secureCookie(name: string, value: string, maxAge: number): string {
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}

export function setSessionCookie(response: VercelResponse, token: string): void {
  response.setHeader('Set-Cookie', secureCookie(SESSION_COOKIE, token, SESSION_MAX_AGE_SECONDS));
}

export function setAuthCookies(
  response: VercelResponse,
  sessionToken: string,
  state: string,
  v4RequestToken?: string,
): void {
  const cookies = [
    secureCookie(SESSION_COOKIE, sessionToken, SESSION_MAX_AGE_SECONDS),
    secureCookie(OAUTH_STATE_COOKIE, state, OAUTH_STATE_MAX_AGE_SECONDS),
  ];
  if (v4RequestToken) {
    cookies.push(secureCookie(V4_REQUEST_TOKEN_COOKIE, v4RequestToken, OAUTH_STATE_MAX_AGE_SECONDS));
  }
  response.setHeader('Set-Cookie', cookies);
}

export function clearOAuthStateCookie(response: VercelResponse): void {
  response.setHeader('Set-Cookie', [
    `${OAUTH_STATE_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
    `${V4_REQUEST_TOKEN_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
  ]);
}

export function clearSessionCookie(response: VercelResponse): void {
  response.setHeader('Set-Cookie', `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);
}

export function refreshSessionAndClearStateCookies(
  response: VercelResponse,
  sessionToken: string,
): void {
  response.setHeader('Set-Cookie', [
    secureCookie(SESSION_COOKIE, sessionToken, SESSION_MAX_AGE_SECONDS),
    `${OAUTH_STATE_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
    `${V4_REQUEST_TOKEN_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
  ]);
}

export function clearAuthCookies(response: VercelResponse): void {
  response.setHeader('Set-Cookie', [
    `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
    `${OAUTH_STATE_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
    `${V4_REQUEST_TOKEN_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
  ]);
}

export function getSessionToken(request: VercelRequest): string | undefined {
  return getCookie(request, SESSION_COOKIE);
}

export function getV4RequestToken(request: VercelRequest): string | undefined {
  return getCookie(request, V4_REQUEST_TOKEN_COOKIE);
}

export async function createSession(token: string): Promise<string> {
  const sessionHash = hash(token);
  const sql = getDatabase();
  await sql`
    INSERT INTO tmdb_user_sessions (session_hash, expires_at)
    VALUES (${sessionHash}, NOW() + INTERVAL '30 days')
    ON CONFLICT (session_hash) DO UPDATE SET
      tmdb_session_id_encrypted = NULL,
      tmdb_account_id = NULL,
      tmdb_account_name = '',
      tmdb_username = '',
      tmdb_avatar_path = NULL,
      tmdb_v4_access_token_encrypted = NULL,
      tmdb_v4_account_id = NULL,
      updated_at = NOW(),
      expires_at = NOW() + INTERVAL '30 days'
  `;
  return sessionHash;
}

function mapSession(row: SessionRow): AccountSession {
  return {
    sessionHash: row.session_hash,
    tmdbSessionId: row.tmdb_session_id_encrypted
      ? decryptToken(row.tmdb_session_id_encrypted)
      : null,
    accountId: row.tmdb_account_id === null ? null : Number(row.tmdb_account_id),
    accountName: row.tmdb_account_name,
    username: row.tmdb_username,
    avatarPath: row.tmdb_avatar_path,
    v4AccessToken: row.tmdb_v4_access_token_encrypted
      ? decryptToken(row.tmdb_v4_access_token_encrypted)
      : null,
    v4AccountId: row.tmdb_v4_account_id,
  };
}

export async function getSession(request: VercelRequest): Promise<AccountSession | null> {
  const token = getSessionToken(request);
  if (!token) return null;
  const sql = getDatabase();
  const rows = await sql`
    SELECT * FROM tmdb_user_sessions
    WHERE session_hash = ${hash(token)} AND expires_at > NOW()
    LIMIT 1
  `;
  const row = rows[0] as SessionRow | undefined;
  return row ? mapSession(row) : null;
}

export async function requireSession(request: VercelRequest): Promise<AccountSession> {
  const session = await getSession(request);
  if (!session) throw new AccountHttpError(401, 'TMDB account is not connected');
  return session;
}

export class AccountHttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function saveV3Account(
  sessionHash: string,
  sessionId: string,
  account: {
    id: number;
    name?: string;
    username: string;
    avatar?: { tmdb?: { avatar_path?: string | null } | null } | null;
  },
): Promise<void> {
  const encryptedSession = encryptToken(sessionId);
  const sql = getDatabase();
  await sql`
    UPDATE tmdb_user_sessions SET
      tmdb_session_id_encrypted = ${encryptedSession},
      tmdb_account_id = ${account.id},
      tmdb_account_name = ${account.name ?? ''},
      tmdb_username = ${account.username},
      tmdb_avatar_path = ${account.avatar?.tmdb?.avatar_path ?? null},
      updated_at = NOW(),
      expires_at = NOW() + INTERVAL '30 days'
    WHERE session_hash = ${sessionHash}
  `;
}

export async function saveV4Account(
  sessionHash: string,
  accessToken: string,
  accountId: string,
): Promise<void> {
  const encryptedToken = encryptToken(accessToken);
  const sql = getDatabase();
  await sql`
    UPDATE tmdb_user_sessions SET
      tmdb_v4_access_token_encrypted = ${encryptedToken},
      tmdb_v4_account_id = ${accountId},
      updated_at = NOW(),
      expires_at = NOW() + INTERVAL '30 days'
    WHERE session_hash = ${sessionHash}
  `;
}

export async function createOAuthState(
  state: string,
  sessionHash: string,
  flow: 'v3' | 'v4',
): Promise<void> {
  const sql = getDatabase();
  await sql`
    INSERT INTO tmdb_oauth_states (state_hash, session_hash, flow, expires_at)
    VALUES (${hash(state)}, ${sessionHash}, ${flow}, NOW() + INTERVAL '10 minutes')
  `;
}

export async function consumeOAuthState(
  state: string,
): Promise<OAuthStateRow | null> {
  const sql = getDatabase();
  const rows = await sql`
    DELETE FROM tmdb_oauth_states
    WHERE state_hash = ${hash(state)} AND expires_at > NOW()
    RETURNING session_hash, flow
  `;
  return (rows[0] as OAuthStateRow | undefined) ?? null;
}

export async function deleteSession(sessionHash: string): Promise<void> {
  const sql = getDatabase();
  await sql`DELETE FROM tmdb_user_sessions WHERE session_hash = ${sessionHash}`;
}

export function requireSameOrigin(request: VercelRequest): void {
  const origin = getHeader(request, 'origin');
  const host = getHeader(request, 'x-forwarded-host') ?? getHeader(request, 'host');
  const forwardedProto = getHeader(request, 'x-forwarded-proto')?.split(',')[0]?.trim();
  const protocol = forwardedProto ?? 'https';
  const normalizedHost = host?.split(',')[0]?.trim();
  if (!origin || !normalizedHost || origin !== `${protocol}://${normalizedHost}`) {
    throw new AccountHttpError(403, 'Request origin is not allowed');
  }
}

export function respondWithError(response: VercelResponse, error: unknown): void {
  if (error instanceof AccountHttpError) {
    response.status(error.status).json({ error: error.message });
    return;
  }
  response.status(502).json({ error: 'TMDB account request failed' });
}

export function singleQueryValue(
  query: VercelRequest['query'],
  key: string,
): string | undefined | null {
  const value = query?.[key];
  return Array.isArray(value) ? null : value;
}

export function parseBody(body: unknown): Record<string, unknown> {
  if (body && typeof body === 'object' && !Array.isArray(body)) {
    return body as Record<string, unknown>;
  }
  return {};
}

export function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

export function isValidPage(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 1 && value <= 500;
}

export function redirect(response: VercelResponse, location: string): void {
  response.setHeader('Location', location);
  response.status(302).json({});
}

export function appCallbackUrl(
  params: Record<string, string>,
  request: VercelRequest,
): string {
  const host = getHeader(request, 'x-forwarded-host') ?? getHeader(request, 'host');
  const protocol = getHeader(request, 'x-forwarded-proto')?.split(',')[0] ?? 'https';
  if (!host) throw new Error('Vercel request host is not available');
  const url = new URL('/api/account/auth/callback', `${protocol}://${host}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return url.toString();
}

export async function callTMDB<T>(
  path: string,
  options: {
    version?: '3' | '4';
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    body?: unknown;
    v4Token?: string;
    sessionId?: string;
  } = {},
): Promise<T> {
  const version = options.version ?? '3';
  const url = new URL(`https://api.themoviedb.org/${version}${path}`);
  const headers: Record<string, string> = { Accept: 'application/json' };
  const apiKey = process.env.TMDB_API_KEY;
  if (!apiKey) throw new Error('TMDB_API_KEY is not configured');

  if (version === '3') {
    url.searchParams.set('api_key', apiKey);
    if (options.sessionId) url.searchParams.set('session_id', options.sessionId);
  } else if (options.v4Token) {
    headers.Authorization = `Bearer ${options.v4Token}`;
  } else {
    const appToken = process.env.TMDB_V4_ACCESS_TOKEN;
    if (!appToken) throw new Error('TMDB_V4_ACCESS_TOKEN is not configured');
    headers.Authorization = `Bearer ${appToken}`;
  }

  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  const result = await fetch(url, {
    method: options.method ?? 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  if (!result.ok) {
    throw new AccountHttpError(
      result.status === 401 ? 401 : 502,
      result.status === 401 ? 'TMDB account authorization expired' : 'TMDB account request failed',
    );
  }
  return await result.json() as T;
}

export function sessionCookieName(): string {
  return SESSION_COOKIE;
}

export function oauthStateCookieName(): string {
  return OAUTH_STATE_COOKIE;
}

export { OAUTH_STATE_MAX_AGE_SECONDS, SESSION_MAX_AGE_SECONDS };
