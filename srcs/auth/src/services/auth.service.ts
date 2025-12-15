import bcrypt from 'bcrypt'
import * as db from './database.js'
import { createUserProfile } from './external/um.service.js'
import { DataError, ServiceError } from '../types/errors.js'
import { APP_ERRORS } from '../utils/error-catalog.js'
import { logger } from '../utils/logger.js'
import { EVENTS, REASONS } from '../utils/constants.js'

const SALT_ROUNDS = 10


export function findUser(identifier: string) {
  return db.findUserByIdentifier(identifier)
}

export function findByUsername(username: string) {
  return db.findUserByUsername(username)
}

export function findByEmail(email: string) {
  return db.findUserByEmail(email)
}

export async function createUser(user: { username: string; email?: string | null; password: string }): Promise<number> {
  const hash = await bcrypt.hash(user.password, SALT_ROUNDS);
  let userId: number;
  
  try {
      userId = db.createUser({ username: user.username, email: user.email || null, password: hash });
  } catch (err: any) {
    if (err instanceof DataError) {
        if (err.meta?.field === 'email') {
            throw new ServiceError(APP_ERRORS.REG_EMAIL_EXISTS, { details: user.email });
        }
        if (err.meta?.field === 'username') {
            throw new ServiceError(APP_ERRORS.REG_USERNAME_TAKEN, { details: user.username });
        }
    }
    throw err;
  }
  
  try {
    await createUserProfile({
        authId: userId,
        email: user.email || "",
        username: user.username
    });
    return userId;
  } catch (error) {
    logger.warn({event: EVENTS.INFRA.ROLLBACK, userId, reason: REASONS.NETWORK.UPSTREAM_ERROR });
    db.deleteUser(userId);
    throw error;
  }
}

export function validateUser(identifier: string, password: string) {
  const user = findUser(identifier)
  logger.debug({user});
  if (!user) return false
  return bcrypt.compareSync(password, user.password)
}

// DEV ONLY - À supprimer en production
export function listUsers() {
  return db.listUsers()
}

export type UserRow = ReturnType<typeof db.findUserByIdentifier>
