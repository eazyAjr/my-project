import { neon } from '@neondatabase/serverless'
import dotenv from 'dotenv'
import fetch from 'cross-fetch'

// 为 Node 16 提供 fetch polyfill
if (!globalThis.fetch) {
  globalThis.fetch = fetch
}

dotenv.config()

const connectionString = process.env.DATABASE_URL

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set')
}

export const sql = neon(connectionString)
