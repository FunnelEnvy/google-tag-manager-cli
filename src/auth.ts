import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { URL } from 'node:url';
import { ConfigManager, type CliConfig } from './lib/config.js';

const config = new ConfigManager('gtm');

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GTM_SCOPES = [
  'https://www.googleapis.com/auth/tagmanager.readonly',
  'https://www.googleapis.com/auth/tagmanager.edit.containers',
  'https://www.googleapis.com/auth/tagmanager.edit.containerversions',
  'https://www.googleapis.com/auth/tagmanager.publish',
].join(' ');
const REDIRECT_PORT = 8485;
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}`;

export interface ServiceAccountKey {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
}

export function getConfig(): ConfigManager {
  return config;
}

export async function resolveAccessToken(flagValue?: string): Promise<string | undefined> {
  if (flagValue) return flagValue;

  const envVal = process.env['GTM_ACCESS_TOKEN'];
  if (envVal) return envVal;

  const auth = config.get('auth');
  if (!auth) return undefined;

  if (auth.service_account_key_path) {
    return getServiceAccountToken(auth.service_account_key_path);
  }

  if (auth.oauth_token) {
    if (auth.oauth_expires_at && Date.now() >= auth.oauth_expires_at) {
      if (auth.oauth_refresh_token && auth.client_id && auth.client_secret) {
        return refreshOAuthToken(auth.oauth_refresh_token, auth.client_id, auth.client_secret);
      }
      return undefined;
    }
    return auth.oauth_token;
  }

  return undefined;
}

export async function requireAccessToken(flagValue?: string): Promise<string> {
  const token = await resolveAccessToken(flagValue);
  if (!token) {
    console.error(
      `No credentials found. Provide one via:\n` +
        `  1. --access-token flag\n` +
        `  2. GTM_ACCESS_TOKEN environment variable\n` +
        `  3. gtm auth login`,
    );
    process.exit(1);
  }
  return token;
}

export function getAuthHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
  };
}

export async function startOAuthLogin(clientId: string, clientSecret: string): Promise<void> {
  const { randomBytes } = await import('node:crypto');
  const state = randomBytes(32).toString('hex');

  const authUrl = new URL(GOOGLE_AUTH_URL);
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', GTM_SCOPES);
  authUrl.searchParams.set('access_type', 'offline');
  authUrl.searchParams.set('prompt', 'consent');
  authUrl.searchParams.set('state', state);

  console.log(`Opening browser for authorization...\n`);
  console.log(`If the browser doesn't open, visit:\n${authUrl.toString()}\n`);

  const open = await import('open');
  await open.default(authUrl.toString());

  const { code } = await waitForOAuthCallback(state);
  const tokens = await exchangeCodeForTokens(code, clientId, clientSecret);

  config.set('auth', {
    oauth_token: tokens.access_token,
    oauth_refresh_token: tokens.refresh_token,
    oauth_expires_at: Date.now() + tokens.expires_in * 1000,
    client_id: clientId,
    client_secret: clientSecret,
  });

  console.log('Authentication successful! Credentials saved.');
}

export function setupServiceAccount(keyFilePath: string): void {
  try {
    const raw = readFileSync(keyFilePath, 'utf-8');
    const key = JSON.parse(raw) as ServiceAccountKey;

    if (key.type !== 'service_account') {
      console.error('Error: The provided JSON file is not a service account key.');
      process.exit(1);
    }

    config.set('auth', {
      service_account_key_path: keyFilePath,
    });

    console.log(`Service account configured: ${key.client_email}`);
  } catch (err) {
    console.error(`Error reading service account key file: ${(err as Error).message}`);
    process.exit(1);
  }
}

export function getAuthStatus(): { method: string; details: string } | null {
  const auth = config.get('auth');
  if (!auth) return null;

  if (auth.service_account_key_path) {
    try {
      const raw = readFileSync(auth.service_account_key_path, 'utf-8');
      const key = JSON.parse(raw) as ServiceAccountKey;
      return {
        method: 'Service Account',
        details: key.client_email,
      };
    } catch {
      return {
        method: 'Service Account',
        details: `Key file: ${auth.service_account_key_path} (unreadable)`,
      };
    }
  }

  if (auth.oauth_token) {
    const expired = auth.oauth_expires_at ? Date.now() >= auth.oauth_expires_at : false;
    const hasRefresh = !!auth.oauth_refresh_token;
    return {
      method: 'OAuth2',
      details: expired
        ? hasRefresh
          ? 'Token expired (will auto-refresh)'
          : 'Token expired (no refresh token)'
        : 'Token valid',
    };
  }

  return null;
}

function waitForOAuthCallback(expectedState: string): Promise<{ code: string }> {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      try {
        const url = new URL(req.url ?? '/', `http://localhost:${REDIRECT_PORT}`);
        const code = url.searchParams.get('code');
        const state = url.searchParams.get('state');
        const error = url.searchParams.get('error');

        if (error) {
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end(`<html><body><h1>Authorization failed: ${error}</h1></body></html>`);
          server.close();
          reject(new Error(`OAuth authorization failed: ${error}`));
          return;
        }

        if (state !== expectedState) {
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end('<html><body><h1>Invalid state parameter</h1></body></html>');
          return;
        }

        if (!code) {
          res.writeHead(400, { 'Content-Type': 'text/html' });
          res.end('<html><body><h1>Missing authorization code</h1></body></html>');
          return;
        }

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(
          '<html><body><h1>Authorization successful!</h1><p>You can close this window.</p></body></html>',
        );
        server.close();
        resolve({ code });
      } catch (err) {
        server.close();
        reject(err);
      }
    });

    server.listen(REDIRECT_PORT, '127.0.0.1');
    server.on('error', reject);

    setTimeout(() => {
      server.close();
      reject(new Error('OAuth callback timed out after 5 minutes'));
    }, 5 * 60 * 1000);
  });
}

async function exchangeCodeForTokens(
  code: string,
  clientId: string,
  clientSecret: string,
): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: REDIRECT_URI,
      grant_type: 'authorization_code',
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Token exchange failed: ${text}`);
  }

  return response.json();
}

async function refreshOAuthToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string,
): Promise<string> {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to refresh OAuth token. Run: gtm auth login');
  }

  const data = (await response.json()) as { access_token: string; expires_in: number };

  const currentConfig = config.read();
  config.write({
    ...currentConfig,
    auth: {
      ...currentConfig.auth,
      oauth_token: data.access_token,
      oauth_expires_at: Date.now() + data.expires_in * 1000,
    },
  });

  return data.access_token;
}

async function getServiceAccountToken(keyFilePath: string): Promise<string> {
  const raw = readFileSync(keyFilePath, 'utf-8');
  const key = JSON.parse(raw) as ServiceAccountKey;

  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      iss: key.client_email,
      scope: GTM_SCOPES,
      aud: key.token_uri,
      iat: now,
      exp: now + 3600,
    }),
  ).toString('base64url');

  const { createSign } = await import('node:crypto');
  const sign = createSign('RSA-SHA256');
  sign.update(`${header}.${payload}`);
  const signature = sign.sign(key.private_key, 'base64url');

  const jwt = `${header}.${payload}.${signature}`;

  const response = await fetch(key.token_uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Service account token exchange failed: ${text}`);
  }

  const data = (await response.json()) as { access_token: string };
  return data.access_token;
}
