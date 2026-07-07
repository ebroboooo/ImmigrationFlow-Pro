import type { AuthTokens, IAuthService } from './IAuthService';
import { calendarConfig, isGoogleCalendarConfigured } from '../calendar/calendarConfig';

const TOKEN_KEY_PREFIX = 'immflow_google_auth_';

interface GsiTokenResponse {
  access_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: GsiTokenResponse) => void;
            error_callback?: (err: { type?: string; message?: string }) => void;
          }) => { requestAccessToken: (opts?: { prompt?: string }) => void };
          revoke: (token: string, callback: () => void) => void;
        };
      };
    };
  }
}

function tokenStorageKey(tenantId: string): string {
  return `${TOKEN_KEY_PREFIX}${tenantId}`;
}

function loadGsiScript(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${calendarConfig.gsiScriptUrl}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Could not load Google Sign-In.')));
      return;
    }
    const script = document.createElement('script');
    script.src = calendarConfig.gsiScriptUrl;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Could not load Google Sign-In. Check your internet connection.'));
    document.head.appendChild(script);
  });
}

export class GoogleAuthService implements IAuthService {
  readonly providerId = 'google' as const;

  isConfigured(): boolean {
    return isGoogleCalendarConfigured();
  }

  getStoredTokens(tenantId: string): AuthTokens | null {
    const raw = localStorage.getItem(tokenStorageKey(tenantId));
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthTokens;
    } catch {
      return null;
    }
  }

  saveTokens(tenantId: string, tokens: AuthTokens): void {
    localStorage.setItem(tokenStorageKey(tenantId), JSON.stringify(tokens));
  }

  clearTokens(tenantId: string): void {
    localStorage.removeItem(tokenStorageKey(tenantId));
  }

  signOut(): void {
    // Per-tenant revoke handled in disconnect
  }

  async signIn(scopes: string[]): Promise<AuthTokens> {
    if (!this.isConfigured()) {
      throw new Error('Google Calendar is not configured. Add VITE_GOOGLE_CLIENT_ID to your environment.');
    }
    await loadGsiScript();
    if (!window.google?.accounts?.oauth2) {
      throw new Error('Google Sign-In failed to initialize.');
    }

    return new Promise((resolve, reject) => {
      const client = window.google!.accounts.oauth2.initTokenClient({
        client_id: calendarConfig.googleClientId,
        scope: scopes.join(' '),
        callback: (response) => {
          if (response.error) {
            if (response.error === 'access_denied') {
              reject(new Error('Google sign-in was cancelled or permission was denied.'));
              return;
            }
            reject(new Error(response.error_description ?? 'Google sign-in failed.'));
            return;
          }
          if (!response.access_token || !response.expires_in) {
            reject(new Error('Google did not return an access token.'));
            return;
          }
          resolve({
            accessToken: response.access_token,
            expiresAt: Date.now() + response.expires_in * 1000,
          });
        },
        error_callback: (err) => {
          if (err.type === 'popup_closed') {
            reject(new Error('Google sign-in was cancelled.'));
            return;
          }
          reject(new Error(err.message ?? 'Google sign-in failed.'));
        },
      });
      client.requestAccessToken({ prompt: 'consent' });
    });
  }

  async getValidAccessToken(tenantId: string, scopes: string[]): Promise<string> {
    const stored = this.getStoredTokens(tenantId);
    if (stored && stored.expiresAt > Date.now() + 60_000) {
      return stored.accessToken;
    }
    const fresh = await this.signIn(scopes);
    this.saveTokens(tenantId, fresh);
    return fresh.accessToken;
  }

  revokeToken(accessToken: string): Promise<void> {
    return new Promise((resolve) => {
      if (!window.google?.accounts?.oauth2) {
        resolve();
        return;
      }
      window.google.accounts.oauth2.revoke(accessToken, () => resolve());
    });
  }
}

export const googleAuthService = new GoogleAuthService();
