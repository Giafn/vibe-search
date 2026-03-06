'use client'

import { useEffect, useRef, useState } from 'react'

interface PlayerScore {
  player_id: string
  player_name: string
  total_points: number
  words_found: number
}

interface LeaderboardProps {
  scores: PlayerScore[]
}

const MEDALS = ['🥇', '🥈', '🥉']
const RANK_STYLES = [
  { color: '#FFD700', glow: 'rgba(255,215,0,0.3)', bg: 'rgba(255,215,0,0.08)' },
  { color: '#C0C0C0', glow: 'rgba(192,192,192,0.2)', bg: 'rgba(192,192,192,0.05)' },
  { color: '#CD7F32', glow: 'rgba(205,127,50,0.2)', bg: 'rgba(205,127,50,0.05)' },
]

export default function Leaderboard({ scores }: LeaderboardProps) {
  const [prevScores, setPrevScores] = useState<PlayerScore[]>([])
  const [animatingIds, setAnimatingIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    // Detect score changes
    const changed = scores.filter(s => {
      const prev = prevScores.find(p => p.player_id === s.player_id)
      return !prev || prev.total_points !== s.total_points
    })

    if (changed.length > 0) {
      const ids = new Set(changed.map(c => c.player_id))
      setAnimatingIds(ids)
      setTimeout(() => setAnimatingIds(new Set()), 600)
    }

    setPrevScores(scores)
  }, [scores])

  if (scores.length === 0) {
    return (
      <div className="text-center py-8 text-blue-400 opacity-50">
        <div className="text-3xl mb-2">🎯</div>
        <p className="text-sm">Belum ada pemain yang join</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {scores.map((score, index) => {
        const rankStyle = RANK_STYLES[index] || { color: 'rgba(255,255,255,0.7)', glow: 'transparent', bg: 'rgba(255,255,255,0.03)' }
        const medal = MEDALS[index] || `#${index + 1}`
        const isAnimating = animatingIds.has(score.player_id)

        return (
          <div
            key={score.player_id}
            className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-500"
            style={{
              background: rankStyle.bg,
              border: `1px solid ${index < 3 ? rankStyle.color + '33' : 'rgba(61,126,255,0.1)'}`,
              transform: isAnimating ? 'scale(1.03)' : 'scale(1)',
              boxShadow: isAnimating ? `0 0 20px ${rankStyle.glow}` : 'none',
            }}>
            
            {/* Rank */}
            <div className="w-8 text-center text-lg leading-none">
              {typeof medal === 'string' && medal.startsWith('#') ? (
                <span style={{ color: rankStyle.color, fontFamily: 'Orbitron, sans-serif', fontSize: '12px', fontWeight: 700 }}>
                  {medal}
                </span>
              ) : medal}
            </div>

            {/* Name */}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate" style={{ color: index < 3 ? rankStyle.color : 'white' }}>
                {score.player_name}
              </p>
              <p className="text-xs opacity-50">
                {score.words_found > 0 ? `${score.words_found} kata` : 'Belum menemukan kata'}
              </p>
            </div>

            {/* Points */}
            <div className="text-right">
              <p className="font-black text-lg leading-none"
                style={{ 
                  fontFamily: 'Orbitron, sans-serif',
                  color: rankStyle.color,
                  textShadow: `0 0 10px ${rankStyle.glow}`,
                }}>
                {score.total_points}
              </p>
              <p className="text-xs opacity-50">pts</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
