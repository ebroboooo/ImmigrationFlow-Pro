export interface AuthTokens {
  accessToken: string;
  expiresAt: number;
  email?: string;
}

export interface IAuthService {
  readonly providerId: 'google';
  isConfigured(): boolean;
  signIn(scopes: string[]): Promise<AuthTokens>;
  signOut(): void;
  getStoredTokens(tenantId: string): AuthTokens | null;
  saveTokens(tenantId: string, tokens: AuthTokens): void;
  clearTokens(tenantId: string): void;
  getValidAccessToken(tenantId: string, scopes: string[]): Promise<string>;
}
