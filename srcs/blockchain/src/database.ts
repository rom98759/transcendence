import Database from 'better-sqlite3'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Résolution absolue du fichier
const dbPath = join(__dirname, '../src/blockchain.db')

export const db = new Database(dbPath)

console.log('Using SQLite file:', dbPath)
