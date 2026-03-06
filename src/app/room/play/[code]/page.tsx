'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import { v4 as uuidv4 } from 'uuid'
import { supabase, WordMetadata } from '@/lib/supabase'
import InputField from '@/components/participant/InputField'
import HistoryList from '@/components/participant/HistoryList'

interface HistoryItem {
  id: string
  word: string
  isCorrect: boolean
  isAlreadyFound: boolean
  points: number
  message: string
  time: string
}

interface Box {
  id: string
  metadata: WordMetadata[]
  order_index: number
}

function getTime() {
  return new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export default function PlayPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const code = params?.code as string
  const nameParam = searchParams?.get('name') || ''

  const [playerId, setPlayerId] = useState('')
  const [playerName, setPlayerName] = useState(nameParam)
  const [nameSet, setNameSet] = useState(!!nameParam)
  const [nameInput, setNameInput] = useState(nameParam)

  const [room, setRoom] = useState<{ id: string; status: string; timer: number; game_started_at: string | null } | null>(null)
  const [activeBox, setActiveBox] = useState<Box | null>(null)
  const [allBoxes, setAllBoxes] = useState<Box[]>([])
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [myScore, setMyScore] = useState(0)
  const [myWords, setMyWords] = useState(0)
  const [loading, setLoading] = useState(false)
  const [gameStatus, setGameStatus] = useState<'WAITING' | 'PLAYING' | 'FINISHED'>('WAITING')
  const [timeLeft, setTimeLeft] = useState<number | null>(null)

  // Init player ID and load saved name & history
  useEffect(() => {
    let id = ''
    try {
      id = localStorage.getItem('vibePlayerId') || uuidv4()
      localStorage.setItem('vibePlayerId', id)

      // Load saved player name for this room
      const savedName = localStorage.getItem(`vibePlayerName_${code}`)
      const savedNameSet = localStorage.getItem(`vibeNameSet_${code}`)
      if (savedName) {
        setPlayerName(savedName)
        setNameInput(savedName)
        // Only auto-set nameSet if game hasn't finished
        const nameSet = savedNameSet === 'true'
        setNameSet(nameSet)
      }

      // Load saved history for this room
      const savedHistory = localStorage.getItem(`vibeHistory_${code}`)
      if (savedHistory) {
        try {
          const parsed = JSON.parse(savedHistory) as HistoryItem[]
          setHistory(parsed)

          // Calculate score from saved history
          const savedScore = parsed
            .filter(h => h.isCorrect)
            .reduce((sum, h) => sum + h.points, 0)
          setMyScore(savedScore)
          setMyWords(parsed.filter(h => h.isCorrect).length)
        } catch {
          // Invalid JSON, ignore
        }
      }

      // Load saved score
      const savedScore = localStorage.getItem(`vibeScore_${code}`)
      if (savedScore) {
        setMyScore(parseInt(savedScore, 10) || 0)
      }

      const savedWords = localStorage.getItem(`vibeWords_${code}`)
      if (savedWords) {
        setMyWords(parseInt(savedWords, 10) || 0)
      }
    } catch {
      id = uuidv4()
    }
    setPlayerId(id)
  }, [code])

  // Load room
  useEffect(() => {
    if (!code || !playerId) return

    async function load() {
      const { data: roomData } = await supabase
        .from('rooms')
        .select('id, status, timer, game_started_at')
        .eq('code', code)
        .single()

      if (!roomData) return
      setRoom(roomData)
      setGameStatus(roomData.status)

      const { data: boxes } = await supabase
        .from('boxes')
        .select('id, metadata, order_index')
        .eq('room_id', roomData.id)
        .order('order_index')

      if (boxes && boxes.length > 0) {
        setAllBoxes(boxes)
        setActiveBox(boxes[0])

        // Calculate time left based on game_started_at for new players
        if (roomData.status === 'PLAYING' && roomData.game_started_at) {
          const startedAt = new Date(roomData.game_started_at).getTime()
          const now = Date.now()
          const elapsedSeconds = Math.floor((now - startedAt) / 1000)
          const remaining = Math.max(0, roomData.timer - elapsedSeconds)
          setTimeLeft(remaining)
        }
      }
    }
    load()
  }, [code, playerId])

  // Real-time: room status & box updates
  useEffect(() => {
    if (!room?.id) return

    const roomSub = supabase
      .channel(`play-room:${room.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'rooms',
        filter: `id=eq.${room.id}`,
      }, payload => {
        const newStatus = payload.new.status
        setGameStatus(newStatus)

        // Set timer when game starts
        if (newStatus === 'PLAYING' && payload.new.game_started_at && !payload.old.game_started_at) {
          setTimeLeft(room?.timer || 120)
        }

        // Clear localStorage and stop timer when game is finished
        if (newStatus === 'FINISHED') {
          setTimeLeft(0)
          try {
            localStorage.removeItem(`vibeHistory_${code}`)
            localStorage.removeItem(`vibeScore_${code}`)
            localStorage.removeItem(`vibeWords_${code}`)
            localStorage.removeItem(`vibeNameSet_${code}`)
          } catch {
            // localStorage not available
          }
        }
      })
      .subscribe()

    const boxSub = supabase
      .channel(`play-box:${room.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'boxes',
        filter: `room_id=eq.${room.id}`,
      }, payload => {
        // Update the specific box in allBoxes and activeBox if it's the active one
        setAllBoxes(prev => prev.map(b => b.id === payload.new.id ? { ...b, ...payload.new } : b))
        setActiveBox(prev => {
          if (prev && prev.id === payload.new.id) {
            return { ...prev, ...payload.new }
          }
          return prev
        })
      })
      .subscribe()

    return () => {
      supabase.removeChannel(roomSub)
      supabase.removeChannel(boxSub)
    }
  }, [room?.id])

  // Timer
  useEffect(() => {
    if (gameStatus !== 'PLAYING' || timeLeft === null) return
    if (timeLeft <= 0) return

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev === null || prev <= 0) {
          clearInterval(interval)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [gameStatus, timeLeft])

  // Auto move to next box when current box is complete
  useEffect(() => {
    if (!activeBox || !allBoxes.length || gameStatus !== 'PLAYING') return

    const foundCount = activeBox.metadata?.filter((m: WordMetadata) => m.isFound).length || 0
    const totalCount = activeBox.metadata?.length || 0

    // Check if current box is complete
    if (foundCount === totalCount && totalCount > 0) {
      const currentIndex = allBoxes.findIndex(b => b.id === activeBox.id)

      // Move to next box if available
      if (currentIndex < allBoxes.length - 1) {
        const nextBox = allBoxes[currentIndex + 1]
        setActiveBox(nextBox)

        // Show notification for box completion
        if (typeof window !== 'undefined' && navigator.vibrate) {
          navigator.vibrate([200, 100, 200])
        }
      }
    }
  }, [activeBox, allBoxes, gameStatus])

  async function handleSubmit(word: string) {
    if (!room || !activeBox || !playerId || !playerName) return

    setLoading(true)
    try {
      const res = await fetch('/api/room/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          word,
          roomCode: code,
          boxId: activeBox.id,
          playerId,
          playerName,
        }),
      })
      const data = await res.json()

      const item: HistoryItem = {
        id: uuidv4(),
        word: word.toUpperCase(),
        isCorrect: data.isValid,
        isAlreadyFound: data.isAlreadyFound,
        points: data.points || 0,
        message: data.message || '',
        time: getTime(),
      }

      setHistory(prev => {
        const newHistory = [...prev, item]
        // Save to localStorage
        try {
          localStorage.setItem(`vibeHistory_${code}`, JSON.stringify(newHistory))
        } catch {
          // localStorage not available
        }
        return newHistory
      })

      if (data.isValid) {
        setMyScore(prev => {
          const newScore = prev + (data.points || 0)
          try {
            localStorage.setItem(`vibeScore_${code}`, newScore.toString())
          } catch {
            // localStorage not available
          }
          return newScore
        })
        setMyWords(prev => {
          const newWords = prev + 1
          try {
            localStorage.setItem(`vibeWords_${code}`, newWords.toString())
          } catch {
            // localStorage not available
          }
          return newWords
        })
        // Vibrate on correct answer
        if (typeof window !== 'undefined' && navigator.vibrate) {
          navigator.vibrate([100, 50, 100])
        }
      } else if (!data.isValid && !data.isAlreadyFound) {
        // Wrong answer vibrate
        if (typeof window !== 'undefined' && navigator.vibrate) {
          navigator.vibrate(200)
        }
      }
    } catch {
      // network error
    }
    setLoading(false)
  }

  const formatTime = (s: number) => {
    const minutes = Math.floor(s / 60)
    const seconds = s % 60
    if (minutes >= 1) {
      return `${minutes}:${String(seconds).padStart(2, '0')}`
    }
    return `${seconds}s`
  }

  // Name input screen
  if (!nameSet) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="text-5xl mb-3">👾</div>
            <h1 className="text-2xl font-black tracking-wider"
              style={{ fontFamily: 'Orbitron, sans-serif', color: '#00E5FF' }}>
              VIBE SEARCH
            </h1>
            <p className="text-sm text-blue-400 mt-1">Room: <strong style={{ color: '#FFD700' }}>{code}</strong></p>
          </div>

          <div className="rounded-3xl p-6"
            style={{
              background: 'rgba(26,39,68,0.6)',
              border: '1px solid rgba(61,126,255,0.2)',
              backdropFilter: 'blur(20px)',
            }}>
            <label className="text-xs text-blue-300 uppercase tracking-widest mb-2 block">
              Nama Kamu
            </label>
            <input
              type="text"
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && nameInput.trim() && (() => { setPlayerName(nameInput.trim()); setNameSet(true) })()}
              placeholder="Masukkan nama..."
              maxLength={20}
              autoFocus
              className="w-full rounded-xl p-4 text-lg font-bold focus:outline-none mb-4"
              style={{
                background: 'rgba(10,14,26,0.8)',
                border: '1px solid rgba(61,126,255,0.3)',
                color: 'white',
              }}
            />
            <button
              onClick={() => {
                if (nameInput.trim()) {
                  const name = nameInput.trim()
                  setPlayerName(name)
                  setNameSet(true)
                  try {
                    localStorage.setItem(`vibePlayerName_${code}`, name)
                    localStorage.setItem(`vibeNameSet_${code}`, 'true')
                  } catch {
                    // localStorage not available
                  }
                }
              }}
              disabled={!nameInput.trim()}
              className="w-full py-4 rounded-xl font-bold text-lg uppercase tracking-wider transition-all hover:scale-105 active:scale-95 disabled:opacity-40"
              style={{
                fontFamily: 'Orbitron, sans-serif',
                background: 'linear-gradient(135deg, #3D7EFF, #00E5FF)',
                color: '#0A0E1A',
              }}>
              🚀 Masuk Game!
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col p-4 max-w-lg mx-auto overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="font-black text-sm" style={{ fontFamily: 'Orbitron, sans-serif', color: '#00E5FF' }}>
            {playerName}
          </p>
          <p className="text-xs text-blue-400 opacity-60">Room: {code}</p>
        </div>

        {/* Timer */}
        {gameStatus === 'PLAYING' && timeLeft !== null && (
          <div className="text-center px-4 py-2 rounded-xl"
            style={{
              background: 'rgba(26,39,68,0.6)',
              border: `1px solid ${timeLeft < 30 ? 'rgba(255,71,87,0.4)' : 'rgba(61,126,255,0.3)'}`,
            }}>
            <p className="font-black text-2xl tabular-nums"
              style={{
                fontFamily: 'Orbitron, sans-serif',
                color: timeLeft < 30 ? '#FF4757' : '#00E5FF',
              }}>
              {formatTime(timeLeft)}
            </p>
          </div>
        )}

        {/* My score */}
        <div className="text-right">
          <p className="font-black text-2xl" style={{ fontFamily: 'Orbitron, sans-serif', color: '#FFD700' }}>
            {myScore}
          </p>
          <p className="text-xs text-blue-400 opacity-60">{myWords} kata</p>
        </div>
      </div>

      {/* Status banner */}
      {gameStatus === 'WAITING' && (
        <div className="mb-4 py-6 rounded-2xl text-center"
          style={{
            background: 'rgba(255,179,0,0.08)',
            border: '1px solid rgba(255,179,0,0.3)',
          }}>
          <div className="text-4xl mb-2">⏳</div>
          <p className="font-bold" style={{ fontFamily: 'Orbitron, sans-serif', color: '#FFB300' }}>
            Menunggu Master memulai game...
          </p>
        </div>
      )}

      {gameStatus === 'FINISHED' && (
        <div className="mb-4 py-6 rounded-2xl text-center"
          style={{
            background: 'rgba(255,71,87,0.08)',
            border: '1px solid rgba(255,71,87,0.3)',
          }}>
          <div className="text-4xl mb-2">🏁</div>
          <p className="font-bold text-xl" style={{ fontFamily: 'Orbitron, sans-serif', color: '#FF4757' }}>
            Game Selesai!
          </p>
          <p className="text-sm mt-1" style={{ color: '#FFD700' }}>
            Score akhirmu: <strong>{myScore} pts</strong>
          </p>
        </div>
      )}

      {/* Input area */}
      {gameStatus === 'PLAYING' && (
        <div className="mb-4">
          <InputField
            onSubmit={handleSubmit}
            loading={loading}
            disabled={gameStatus !== 'PLAYING'}
          />
        </div>
      )}

      {/* History */}
      <div className="flex-1 min-h-0 rounded-2xl p-4 overflow-auto"
        style={{
          background: 'rgba(26,39,68,0.3)',
          border: '1px solid rgba(61,126,255,0.1)',
        }}>
        <p className="text-xs text-blue-400 uppercase tracking-widest mb-3">Riwayat Tebakan</p>
        <HistoryList history={history} />
      </div>
    </div>
  )
}
