import 'dotenv/config'
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3'
import { appenv } from '../config/env.js'
import prismaPkg from '@prisma/client'

const { PrismaClient } = prismaPkg

const connectionString = appenv.UM_DB_URL

const adapter = new PrismaBetterSqlite3({ url: connectionString })
const prisma = new PrismaClient({ adapter })

export { prisma }
