import 'dotenv/config'
import { PrismaClient } from '../generated/prisma/client.ts'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'

const dbUrl = new URL(process.env.DATABASE_URL)
const adapter = new PrismaMariaDb({
  host: dbUrl.hostname,
  port: parseInt(dbUrl.port) || 3306,
  user: dbUrl.username,
  password: decodeURIComponent(dbUrl.password || ''),
  database: dbUrl.pathname.replace(/^\//, ''),
})
const prisma = new PrismaClient({ adapter })

export default prisma
