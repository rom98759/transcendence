import bcrypt from 'bcrypt';
import * as db from './database.js';
import * as twoFAService from './2fa.service.js';

const SALT_ROUNDS = 10;

export function findUser(identifier: string) {
  return db.findUserByIdentifier(identifier);
}

export function findByUsername(username: string) {
  return db.findUserByUsername(username);
}

export function findByEmail(email: string) {
  return db.findUserByEmail(email);
}

export function createUser(user: { username: string; email?: string | null; password: string }) {
  const hash = bcrypt.hashSync(user.password, SALT_ROUNDS);
  return db.createUser({ username: user.username, email: user.email || null, password: hash });
}

export function validateUser(identifier: string, password: string) {
  const user = findUser(identifier);
  if (!user) return false;
  return bcrypt.compareSync(password, user.password);
}

// Fonctions 2FA
export async function initiate2FA(userId: number, email: string): Promise<string> {
  return await twoFAService.send2FACode(userId, email);
}

export function verify2FA(user: db.DBUser, code: string): boolean {
  return twoFAService.verify2FACode(user, code);
}

export function enable2FA(userId: number) {
  db.toggle2FA(userId, true);
}

export function disable2FA(userId: number) {
  db.toggle2FA(userId, false);
}

export function get2FAStatus(userId: number): boolean {
  const user = db.findUserByIdentifier(userId.toString());
  return user?.twofa_enabled === 1;
}

// DEV ONLY - À supprimer en production
export function listUsers() {
  return db.listUsers();
}

export type UserRow = ReturnType<typeof db.findUserByIdentifier>;
