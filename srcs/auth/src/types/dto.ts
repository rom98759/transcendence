export interface CreateProfileDTO {
  authId: number;
  email: string;
  username: string;
}

export interface UserProfileDTO {
  username: string;
  avatarUrl: string;
}

// ============================================
// OAuth DTOs
// ============================================

/**
 * Données du profil utilisateur retournées par les providers OAuth
 */
export interface OAuthProfile {
  id: string; // ID unique chez le provider
  email: string; // Email principal
  name: string; // Nom complet
  username?: string; // Username (42 seulement)
  login?: string; // Login (42 seulement)
  avatarUrl?: string; // URL de l'avatar
  provider: 'google' | 'school42'; // Provider source
}

/**
 * Réponse de l'échange code/token OAuth
 */
export interface OAuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
}

/**
 * Requête de callback OAuth (frontend vers auth service)
 */
export interface OAuthCallbackRequest {
  code: string; // Code d'autorisation reçu du provider
  state?: string; // State pour vérification CSRF (optionnel)
  provider: 'google' | 'school42'; // Provider utilisé
}

/**
 * Données utilisateur pour création/mise à jour OAuth
 */
export interface OAuthUserData {
  username: string;
  email?: string;
  googleId?: string;
  school42Id?: string;
  oauthEmail?: string;
  avatarUrl?: string;
}
