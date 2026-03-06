import { SignJWT, jwtVerify } from 'jose'

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'vibe-search-default-secret-change-in-prod'
)

export interface PlayerToken {
  playerId: string
  playerName: string
  roomCode: string
}

export async function signPlayerToken(payload: PlayerToken): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(SECRET)
}

export async function verifyPlayerToken(token: string): Promise<PlayerToken | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET)
    return payload as unknown as PlayerToken
  } catch {
    return null
  }
}
