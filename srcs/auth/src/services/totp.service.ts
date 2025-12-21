/**
 * Service TOTP (Time-based One-Time Password)
 * Gestion complète de la 2FA avec Google Authenticator
 *
 * Architecture:
 * - Génération de secrets TOTP sécurisés
 * - Stockage temporaire des secrets en phase de setup
 * - Validation des codes TOTP avec fenêtre de tolérance
 * - Nettoyage automatique des sessions expirées
 */

import { authenticator } from 'otplib'
import QRCode from 'qrcode'
import * as db from './database.js'
import { AUTH_CONFIG } from '../utils/constants.js'
import { logger } from '../index.js'

// ============================================
// Configuration TOTP
// ============================================

/**
 * Configure otplib pour une compatibilité maximale avec Google Authenticator
 */
function configureTOTP() {
  authenticator.options = {
    window: AUTH_CONFIG.TOTP_WINDOW, // Fenêtre de validation (±30s)
    step: AUTH_CONFIG.TOTP_STEP, // Période de rotation (30 secondes standard)
    digits: AUTH_CONFIG.TOTP_DIGITS, // Code à 6 chiffres
  }
}

// Initialiser la configuration au chargement du module
configureTOTP()

// ============================================
// Types
// ============================================

export interface TOTPSetupData {
  secret: string
  otpauthUrl: string
  qrCodeDataUrl: string
}

export interface TOTPSessionData {
  setupToken: string
  userId: number
  expiresAt: Date
}

// ============================================
// Génération de secrets TOTP
// ============================================

/**
 * Génère un nouveau secret TOTP et les données nécessaires pour le setup
 * @param username Nom d'utilisateur pour l'identification dans l'app
 * @returns Secret, URL otpauth et QR code en base64
 */
export async function generateTOTPSetup(username: string): Promise<TOTPSetupData> {
  try {
    // Générer un secret aléatoire sécurisé (32 caractères base32)
    const secret = authenticator.generateSecret()

    // Créer l'URL otpauth:// pour Google Authenticator
    const issuer = AUTH_CONFIG.TOTP_ISSUER
    const otpauthUrl = authenticator.keyuri(username, issuer, secret)

    // Générer le QR code en data URL (base64)
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 300,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    })

    logger.info({
      event: 'totp_secret_generated',
      username,
      issuer,
    })

    return {
      secret,
      otpauthUrl,
      qrCodeDataUrl,
    }
  } catch (err: any) {
    logger.error({
      event: 'totp_generation_error',
      username,
      error: err?.message,
    })

    const error: any = new Error(`Failed to generate TOTP setup: ${err?.message || String(err)}`)
    error.code = 'TOTP_GENERATION_ERROR'
    throw error
  }
}

// ============================================
// Gestion des sessions de setup
// ============================================

/**
 * Crée une session de setup 2FA
 * Stocke temporairement le secret TOTP le temps que l'utilisateur scanne le QR code
 *
 * @param userId ID de l'utilisateur
 * @param secret Secret TOTP à stocker temporairement
 * @returns Token de session pour tracking
 */
export function createSetupSession(userId: number, secret: string): string {
  try {
    const setupToken = db.createLoginToken(userId, AUTH_CONFIG.TOTP_SETUP_EXPIRATION_SECONDS)
    db.storeTotpSetupSecret(setupToken, userId, secret, AUTH_CONFIG.TOTP_SETUP_EXPIRATION_SECONDS)

    logger.info({
      event: 'totp_setup_session_created',
      userId,
      expiresIn: AUTH_CONFIG.TOTP_SETUP_EXPIRATION_SECONDS,
    })

    return setupToken
  } catch (err: any) {
    logger.error({
      event: 'totp_setup_session_error',
      userId,
      error: err?.message,
    })

    const error: any = new Error(`Failed to create setup session: ${err?.message || String(err)}`)
    error.code = 'SETUP_SESSION_ERROR'
    throw error
  }
}

/**
 * Récupère une session de setup active
 * Valide que la session n'est pas expirée et que le token est valide
 *
 * @param setupToken Token de session
 * @returns Données de session si valide, null sinon
 */
export function getSetupSession(
  setupToken: string,
): { userId: number; secret: string; attempts: number } | null {
  try {
    // Valider le token
    const tokenData = db.validateLoginToken(setupToken)
    if (!tokenData) {
      logger.warn({ event: 'totp_setup_session_invalid', reason: 'token_invalid' })
      return null
    }

    // Récupérer le secret associé
    const secretData = db.getTotpSetupSecret(setupToken)
    if (!secretData) {
      logger.warn({
        event: 'totp_setup_session_invalid',
        reason: 'secret_not_found',
        userId: tokenData.userId,
      })
      return null
    }

    // Vérifier la cohérence userId
    if (secretData.userId !== tokenData.userId) {
      logger.error({
        event: 'totp_setup_session_mismatch',
        tokenUserId: tokenData.userId,
        secretUserId: secretData.userId,
      })
      return null
    }

    return {
      userId: tokenData.userId,
      secret: secretData.secret,
      attempts: tokenData.attempts,
    }
  } catch (err: any) {
    logger.error({
      event: 'totp_get_setup_session_error',
      error: err?.message,
    })
    return null
  }
}

/**
 * Supprime une session de setup (après succès ou expiration)
 * @param setupToken Token de session
 */
export function deleteSetupSession(setupToken: string): void {
  try {
    db.deleteTotpSetupSecret(setupToken)
    db.deleteLoginToken(setupToken)

    logger.info({ event: 'totp_setup_session_deleted' })
  } catch (err: any) {
    logger.warn({
      event: 'totp_setup_session_delete_error',
      error: err?.message,
    })
  }
}

// ============================================
// Validation des codes TOTP
// ============================================

/**
 * Vérifie un code TOTP pour une session de setup
 * Utilisé lors de la première configuration de la 2FA
 *
 * @param setupToken Token de session
 * @param code Code à 6 chiffres saisi par l'utilisateur
 * @returns true si valide, false sinon
 */
export function verifySetupCode(setupToken: string, code: string): boolean {
  try {
    const session = getSetupSession(setupToken)

    if (!session) {
      return false
    }

    const isValid = authenticator.verify({
      token: code,
      secret: session.secret,
    })

    if (isValid) {
      logger.info({
        event: 'totp_setup_code_valid',
        userId: session.userId,
      })
    } else {
      logger.warn({
        event: 'totp_setup_code_invalid',
        userId: session.userId,
        attempts: session.attempts + 1,
      })
    }

    return isValid
  } catch (err: any) {
    logger.error({
      event: 'totp_setup_code_verification_error',
      error: err?.message,
    })
    return false
  }
}

/**
 * Vérifie un code TOTP pour un utilisateur ayant déjà activé la 2FA
 * Utilisé lors du login avec 2FA
 *
 * @param userId ID de l'utilisateur
 * @param code Code à 6 chiffres saisi par l'utilisateur
 * @returns true si valide, false sinon
 */
export function verifyLoginCode(userId: number, code: string): boolean {
  try {
    const secret = db.getTotpSecret(userId)

    if (!secret) {
      logger.warn({
        event: 'totp_login_code_no_secret',
        userId,
      })
      return false
    }

    const isValid = authenticator.verify({
      token: code,
      secret: secret,
    })

    if (isValid) {
      logger.info({
        event: 'totp_login_code_valid',
        userId,
      })
    } else {
      logger.warn({
        event: 'totp_login_code_invalid',
        userId,
      })
    }

    return isValid
  } catch (err: any) {
    logger.error({
      event: 'totp_login_code_verification_error',
      userId,
      error: err?.message,
    })
    return false
  }
}

// ============================================
// Activation/Désactivation 2FA
// ============================================

/**
 * Active définitivement la 2FA pour un utilisateur
 * Stocke le secret de manière permanente dans la BDD
 *
 * @param userId ID de l'utilisateur
 * @param secret Secret TOTP à persister
 */
export function enableTOTP(userId: number, secret: string): void {
  try {
    db.enable2FA(userId, secret)

    logger.info({
      event: 'totp_enabled',
      userId,
    })
  } catch (err: any) {
    logger.error({
      event: 'totp_enable_error',
      userId,
      error: err?.message,
    })

    const error: any = new Error(`Failed to enable TOTP: ${err?.message || String(err)}`)
    error.code = 'TOTP_ENABLE_ERROR'
    throw error
  }
}

/**
 * Désactive la 2FA pour un utilisateur
 * Supprime le secret de la BDD
 *
 * @param userId ID de l'utilisateur
 */
export function disableTOTP(userId: number): void {
  try {
    db.disable2FA(userId)

    logger.info({
      event: 'totp_disabled',
      userId,
    })
  } catch (err: any) {
    logger.error({
      event: 'totp_disable_error',
      userId,
      error: err?.message,
    })

    const error: any = new Error(`Failed to disable TOTP: ${err?.message || String(err)}`)
    error.code = 'TOTP_DISABLE_ERROR'
    throw error
  }
}

/**
 * Vérifie si la 2FA est activée pour un utilisateur
 * @param userId ID de l'utilisateur
 * @returns true si 2FA activée
 */
export function isTOTPEnabled(userId: number): boolean {
  try {
    return db.is2FAEnabled(userId)
  } catch (err: any) {
    logger.error({
      event: 'totp_check_enabled_error',
      userId,
      error: err?.message,
    })
    return false
  }
}

// ============================================
// Maintenance et nettoyage
// ============================================

/**
 * Nettoie les sessions expirées
 * Doit être appelé périodiquement (cron job ou interval)
 */
export function cleanupExpiredSessions(): void {
  try {
    db.cleanExpiredTokens()
    db.cleanExpiredTotpSecrets()

    logger.info({ event: 'totp_cleanup_completed' })
  } catch (err: any) {
    logger.error({
      event: 'totp_cleanup_error',
      error: err?.message,
    })
  }
}

/**
 * Incrémente le compteur de tentatives échouées pour une session
 * @param setupToken Token de session
 */
export function incrementSetupAttempts(setupToken: string): void {
  try {
    db.incrementLoginTokenAttempts(setupToken)
  } catch (err: any) {
    logger.error({
      event: 'totp_increment_attempts_error',
      error: err?.message,
    })
  }
}
