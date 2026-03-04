import { ERROR_CODES } from '@transcendence/core';

/**
 * Mapping centralisé : code d'erreur backend → clé de traduction i18n.
 *
 * Garantit un rendu lisible et traduit pour tous les codes retournés par le
 * service auth. Utilisé dans `api-client.ts` via `mapErrorToI18nKey`.
 *
 * Règle de nommage : chaque code correspond à `errors.<code>` dans les
 * fichiers de locales (en/fr/tf). Toute nouvelle entrée ici doit avoir une
 * clé correspondante dans les 3 locales.
 */
export const AUTH_ERROR_I18N: Readonly<Record<string, string>> = {
  // Auth générale
  [ERROR_CODES.INVALID_CREDENTIALS]: `errors.${ERROR_CODES.INVALID_CREDENTIALS}`,
  [ERROR_CODES.RATE_LIMIT_EXCEEDED]: `errors.${ERROR_CODES.RATE_LIMIT_EXCEEDED}`,
  [ERROR_CODES.UNAUTHORIZED]: `errors.${ERROR_CODES.UNAUTHORIZED}`,
  [ERROR_CODES.FORBIDDEN]: `errors.${ERROR_CODES.FORBIDDEN}`,
  [ERROR_CODES.CONFLICT]: `errors.${ERROR_CODES.CONFLICT}`,
  [ERROR_CODES.NOT_FOUND]: `errors.${ERROR_CODES.NOT_FOUND}`,
  [ERROR_CODES.INTERNAL_ERROR]: `errors.${ERROR_CODES.INTERNAL_ERROR}`,
  // Validation
  [ERROR_CODES.VALIDATION_ERROR]: `errors.${ERROR_CODES.VALIDATION_ERROR}`,
  [ERROR_CODES.VALIDATION_MANDATORY]: `errors.${ERROR_CODES.VALIDATION_MANDATORY}`,
  [ERROR_CODES.MISSING_PARAMETERS]: `errors.${ERROR_CODES.MISSING_PARAMETERS}`,
  // 2FA
  [ERROR_CODES.INVALID_2FA_CODE]: `errors.${ERROR_CODES.INVALID_2FA_CODE}`,
  [ERROR_CODES.INVALID_CODE_FORMAT]: `errors.${ERROR_CODES.INVALID_CODE_FORMAT}`,
  [ERROR_CODES.LOGIN_SESSION_EXPIRED]: `errors.${ERROR_CODES.LOGIN_SESSION_EXPIRED}`,
  [ERROR_CODES.SETUP_SESSION_EXPIRED]: `errors.${ERROR_CODES.SETUP_SESSION_EXPIRED}`,
  [ERROR_CODES.TOO_MANY_ATTEMPTS]: `errors.${ERROR_CODES.TOO_MANY_ATTEMPTS}`,
  [ERROR_CODES.TOKEN_MISSING]: `errors.${ERROR_CODES.TOKEN_MISSING}`,
  [ERROR_CODES.TOTP_ALREADY_ENABLED]: `errors.${ERROR_CODES.TOTP_ALREADY_ENABLED}`,
  [ERROR_CODES.TWO_FA_NOT_ENABLED]: `errors.${ERROR_CODES.TWO_FA_NOT_ENABLED}`,
  [ERROR_CODES.USER_NOT_FOUND_2FA]: `errors.${ERROR_CODES.USER_NOT_FOUND_2FA}`,
  ['duplicate_entry']: `zod_errors.duplicate_entry`,
  ['invalid_format']: `zod_errors.invalid_format`,
  ['too_small']: `zod_errors.too_small`,
  ['too_big']: `zod_errors.too_big`,
} as const;

/**
 * Retourne la clé i18n correspondant au code d'erreur backend.
 * Fallback sur `errors.internal_error` si le code est inconnu.
 */
export const mapErrorToI18nKey = (code: string): string =>
  AUTH_ERROR_I18N[code] ?? `errors.${ERROR_CODES.INTERNAL_ERROR}`;
