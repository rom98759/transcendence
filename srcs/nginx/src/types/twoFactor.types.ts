/**
 * Types pour la gestion 2FA (Two-Factor Authentication)
 *
 * Contexte temporaire stocké en mémoire (jamais en localStorage)
 * pour gérer le flux d'authentification 2FA.
 */

/**
 * Contexte 2FA stocké temporairement lors du flux login/oauth
 * Ce contexte est effacé après validation ou abandon
 */
export interface TwoFactorPendingContext {
  /** Username de l'utilisateur en cours d'authentification */
  username: string;
  /** Provider OAuth si authentification via OAuth, null sinon */
  provider?: 'local' | 'google' | 'school42' | null;
  /** Timestamp d'expiration du contexte (en ms) */
  expiresAt: number;
  /** Destination originale à restaurer après 2FA (issue de location.state.from) */
  from?: { pathname: string; search?: string } | null;
}

/**
 * Réponse backend indiquant que 2FA est requise
 */
export interface Require2FAResponse {
  require2FA: true;
  message: string;
  details: string;
  expiresIn: number;
  username: string;
}

/**
 * Payload pour la configuration initiale 2FA
 */
export interface Setup2FAResponse {
  secret: string;
  qrCodeUrl: string;
  backupCodes?: string[];
}

/**
 * Payload pour la vérification du code OTP
 */
export interface Verify2FAPayload {
  code: string;
}

/**
 * Payload pour la désactivation 2FA
 */
export interface Disable2FAPayload {
  password: string;
}

/**
 * État de configuration 2FA utilisateur
 */
export interface TwoFactorStatus {
  enabled: boolean;
  setupAt?: string;
}
