import { APP_CONFIG } from '../config/app';

/**
 * Authentication Service
 * Handles token management and auth state
 */

const TOKEN_KEY = `${APP_CONFIG.storage.prefix}access_token`;
const REFRESH_TOKEN_KEY = `${APP_CONFIG.storage.prefix}refresh_token`;
const ID_TOKEN_KEY = `${APP_CONFIG.storage.prefix}id_token`;
const COGNITO_ID_KEY = `${APP_CONFIG.storage.prefix}cognito_id`;
const USER_KEY = `${APP_CONFIG.storage.prefix}user`;
const MEMBERSHIPS_KEY = `${APP_CONFIG.storage.prefix}memberships`;
const SELECTED_ROLE_KEY = `${APP_CONFIG.storage.prefix}selected_role`;
const PROFILE_COMPLETE_KEY = `${APP_CONFIG.storage.prefix}profile_complete`;

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  idToken: string;
  cognitoId: string;
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
  profileComplete: boolean;
  memberships: {
    landlord: { id: string } | null;
    tenants: Array<{
      id: string;
      unitId: string;
      unitName: string;
      propertyName: string;
      status: string;
    }>;
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
    localStorage.setItem(COGNITO_ID_KEY, tokens.cognitoId);
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
   * Get Cognito ID
   */
  getCognitoId(): string | null {
    return localStorage.getItem(COGNITO_ID_KEY);
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
   * Store memberships
   */
  setMemberships(memberships: {
    landlord: { id: string } | null;
    tenants: Array<{
      id: string;
      unitId: string;
      unitName: string;
      propertyName: string;
      status: string;
    }>
  }): void {
    localStorage.setItem(MEMBERSHIPS_KEY, JSON.stringify(memberships));
  }

  /**
   * Get memberships
   */
  getMemberships(): {
    landlord: { id: string } | null;
    tenants: Array<{
      id: string;
      unitId: string;
      unitName: string;
      propertyName: string;
      status: string;
    }>
  } | null {
    const membershipsStr = localStorage.getItem(MEMBERSHIPS_KEY);
    if (!membershipsStr) return null;
    try {
      return JSON.parse(membershipsStr);
    } catch {
      return null;
    }
  }

  /**
   * Store profile complete status
   */
  setProfileComplete(complete: boolean): void {
    localStorage.setItem(PROFILE_COMPLETE_KEY, JSON.stringify(complete));
  }

  /**
   * Get profile complete status
   */
  getProfileComplete(): boolean {
    const val = localStorage.getItem(PROFILE_COMPLETE_KEY);
    if (!val) return true; // Default to true for existing users
    try {
      return JSON.parse(val);
    } catch {
      return true;
    }
  }

  /**
   * Clear all auth data (logout)
   */
  clearAuth(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(ID_TOKEN_KEY);
    localStorage.removeItem(COGNITO_ID_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(MEMBERSHIPS_KEY);
    localStorage.removeItem(SELECTED_ROLE_KEY);
    localStorage.removeItem(PROFILE_COMPLETE_KEY);
  }

  /**
   * Store selected role for dual-role users
   */
  setSelectedRole(role: 'landlord' | 'tenant', id: string): void {
    localStorage.setItem(SELECTED_ROLE_KEY, JSON.stringify({ role, id }));
  }

  /**
   * Get selected role for dual-role users
   */
  getSelectedRole(): { role: 'landlord' | 'tenant'; id: string } | null {
    const selectedRoleStr = localStorage.getItem(SELECTED_ROLE_KEY);
    if (!selectedRoleStr) return null;
    try {
      return JSON.parse(selectedRoleStr);
    } catch {
      return null;
    }
  }

  /**
   * Logout user (alias for clearAuth)
   */
  logout(): void {
    this.clearAuth();
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
