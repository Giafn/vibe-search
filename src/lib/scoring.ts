import { WordMetadata } from './supabase'

export interface ScoreResult {
  isValid: boolean
  isAlreadyFound: boolean
  points: number
  wordMetadata: WordMetadata | null
  message: string
}

export function validateAndScore(
  word: string,
  metadata: WordMetadata[],
  playerId: string
): ScoreResult {
  const normalized = word.toUpperCase().trim()

  const found = metadata.find(m => m.word === normalized)

  if (!found) {
    return {
      isValid: false,
      isAlreadyFound: false,
      points: 0,
      wordMetadata: null,
      message: 'Kata tidak ditemukan dalam grid',
    }
  }

  if (found.isFound) {
    return {
      isValid: false,
      isAlreadyFound: true,
      points: 0,
      wordMetadata: found,
      message: `Kata sudah ditemukan oleh ${found.foundByName || 'pemain lain'}`,
    }
  }

  return {
    isValid: true,
    isAlreadyFound: false,
    points: found.points,
    wordMetadata: found,
    message: `Benar! +${found.points} poin`,
  }
}

export interface PlayerScore {
  player_id: string
  player_name: string
  total_points: number
  words_found: number
}

export function calculateLeaderboard(submissions: Array<{
  player_id: string
  player_name: string
  is_correct: boolean
  points: number
}>): PlayerScore[] {
  const scoreMap = new Map<string, PlayerScore>()

  for (const sub of submissions) {
    if (!sub.is_correct) continue

    const existing = scoreMap.get(sub.player_id)
    if (existing) {
      existing.total_points += sub.points
      existing.words_found += 1
    } else {
      scoreMap.set(sub.player_id, {
        player_id: sub.player_id,
        player_name: sub.player_name,
        total_points: sub.points,
        words_found: 1,
      })
    }
  }

  return Array.from(scoreMap.values()).sort(
    (a, b) => b.total_points - a.total_points
  )
}
