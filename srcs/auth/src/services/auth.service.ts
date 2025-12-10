import bcrypt from 'bcrypt'
import * as db from './database.js'

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

export function createUser(user: { username: string; email?: string | null; password: string }) {
  const hash = bcrypt.hashSync(user.password, SALT_ROUNDS)
  return db.createUser({ username: user.username, email: user.email || null, password: hash })
}

export function validateUser(identifier: string, password: string) {
  const user = findUser(identifier)
  if (!user) return false
  return bcrypt.compareSync(password, user.password)
}

// DEV ONLY - À supprimer en production
export function listUsers() {
  return db.listUsers()
}

export type UserRow = ReturnType<typeof db.findUserByIdentifier>
