import { createHmac, timingSafeEqual } from 'node:crypto'

export const ADMIN_SESSION_COOKIE = 'admin_session'
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30 // 30 days

function getPassword() {
  const password = process.env.ADMIN_PASSWORD
  if (!password) throw new Error('ADMIN_PASSWORD is not set')
  return password
}

function sign(payload: string) {
  return createHmac('sha256', getPassword()).update(payload).digest('hex')
}

function safeEqual(a: string, b: string) {
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

export function verifyPassword(candidate: string) {
  return safeEqual(candidate, getPassword())
}

export function createSessionToken() {
  const expires = String(Date.now() + SESSION_TTL_MS)
  return `${expires}.${sign(expires)}`
}

export function verifySessionToken(token: string | undefined | null) {
  if (!token) return false
  const [expires, signature] = token.split('.')
  if (!expires || !signature) return false
  if (!safeEqual(signature, sign(expires))) return false
  return Number(expires) > Date.now()
}
