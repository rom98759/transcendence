import nodemailer from 'nodemailer';
import * as db from './database.js';
import { logger } from '../utils/logger.js';

const CODE_LENGTH = 6;
const CODE_EXPIRATION_MINUTES = 5;

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Fonction pour envoyer un email réel
export async function sendRealEmail(to: string, code: string) {
  const info = await transporter.sendMail({
    from: `Transcendance <${process.env.EMAIL_FROM}>`,
    to,
    subject: "Code de connexion",
    html: `
      <h2>Connexion sécurisée</h2>
      <p>Ton code 2FA :</p>
      <h1 style="letter-spacing:5px">${code}</h1>
      <p>Valable 5 minutes.</p>
    `,
  });

  console.log("Email envoyé ✅ :", info.messageId);
}

/**
 * Génère un code 2FA aléatoire de 6 chiffres
 */
export function generate2FACode(): string {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  return code;
}

/**
 * Envoie un code 2FA par email
 */
export async function send2FACode(userId: number, email: string): Promise<string> {
  try {
    // Générer le code
    const code = generate2FACode();

    // Calculer l'expiration (5 minutes)
    const expiresAt = Date.now() + CODE_EXPIRATION_MINUTES * 60 * 1000;

    // Sauvegarder en base de données
    db.update2FACode(userId, code, expiresAt);

    // Envoyer l'email
    await sendRealEmail(email, code);

    logger.info({
      event: '2fa_code_generated',
      userId,
      email,
      expiresAt: new Date(expiresAt).toISOString()
    });

    return code;
  } catch (err: any) {
    logger.error({
      event: '2fa_code_generation_error',
      userId,
      email,
      err: err?.message || err
    });
    throw err;
  }
}

/**
 * Vérifie un code 2FA
 */
export function verify2FACode(user: db.DBUser, inputCode: string): boolean {
  try {
    // Vérifier que le code existe
    if (!user.twofa_code) {
      logger.warn({ event: '2fa_verification_failed', userId: user.id, reason: 'no_code_stored' });
      return false;
    }

    // Vérifier l'expiration
    if (!user.twofa_code_expires || user.twofa_code_expires < Date.now()) {
      logger.warn({ event: '2fa_verification_failed', userId: user.id, reason: 'code_expired' });
      return false;
    }

    // Vérifier le code
    if (user.twofa_code !== inputCode) {
      logger.warn({ event: '2fa_verification_failed', userId: user.id, reason: 'invalid_code' });
      return false;
    }

    // Code valide - nettoyer
    db.clear2FACode(user.id!);
    logger.info({ event: '2fa_verification_success', userId: user.id });

    return true;
  } catch (err: any) {
    logger.error({
      event: '2fa_verification_error',
      userId: user.id,
      err: err?.message || err
    });
    return false;
  }
}

/**
 * Nettoie les codes 2FA expirés (à appeler périodiquement)
 */
export function cleanExpiredCodes(): void {
  // TODO: Implémenter un nettoyage périodique si nécessaire
  logger.info({ event: '2fa_cleanup_triggered' });
}
