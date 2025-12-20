import 'dotenv/config'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { appenv } from '../config/env.js'
import { PrismaClient } from '@prisma/client'

const connectionString = appenv.UM_DB_URL

const adapter = new PrismaBetterSqlite3({ url: connectionString })
const prisma = new PrismaClient({ adapter })

export { prisma }
