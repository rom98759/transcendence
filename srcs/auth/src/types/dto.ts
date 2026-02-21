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
  avatarUrl?: string; // URL de l'avatar
  provider: 'google' | 'school42'; // Provider source
}
