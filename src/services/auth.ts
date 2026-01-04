/**
 * Authentication Service
 * Handles token management and auth state
 */

const TOKEN_KEY = 'renttrack_access_token';
const REFRESH_TOKEN_KEY = 'renttrack_refresh_token';
const ID_TOKEN_KEY = 'renttrack_id_token';
const USER_KEY = 'renttrack_user';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  idToken: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  cognitoId: string;
}

export interface LoginResponse {
  tokens: AuthTokens;
  user: User;
  memberships: {
    landlord: { id: string } | null;
    tenants: Array<{ id: string; unitId: string }>;
  };
}

class AuthService {
  /**
   * Store authentication tokens
   */
  setTokens(tokens: AuthTokens): void {
    localStorage.setItem(TOKEN_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
    localStorage.setItem(ID_TOKEN_KEY, tokens.idToken);
  }

  /**
   * Get access token
   */
  getAccessToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  /**
   * Get refresh token
   */
  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  }

  /**
   * Store user data
   */
  setUser(user: User): void {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  /**
   * Get user data
   */
  getUser(): User | null {
    const userStr = localStorage.getItem(USER_KEY);
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }

  /**
   * Clear all auth data (logout)
   */
  clearAuth(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(ID_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }

  /**
   * Get authorization header
   */
  getAuthHeader(): string {
    const token = this.getAccessToken();
    return token ? `Bearer ${token}` : '';
  }
}

export const authService = new AuthService();
