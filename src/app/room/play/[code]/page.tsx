'use client'

import { useEffect, useState, useCallback } from 'react'
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
  timer: number
  order_index: number
}

interface PlayerScore {
  player_id: string
  player_name: string
  total_points: number
  words_found: number
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

  const [room, setRoom] = useState<{ id: string; status: string } | null>(null)
  const [activeBox, setActiveBox] = useState<Box | null>(null)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [myScore, setMyScore] = useState(0)
  const [myWords, setMyWords] = useState(0)
  const [loading, setLoading] = useState(false)
  const [gameStatus, setGameStatus] = useState<'WAITING' | 'PLAYING' | 'FINISHED'>('WAITING')
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const [roomLoaded, setRoomLoaded] = useState(false)

  // Init player ID
  useEffect(() => {
    let id = ''
    try {
      id = localStorage.getItem('vibePlayerId') || uuidv4()
      localStorage.setItem('vibePlayerId', id)
    } catch {
      id = uuidv4()
    }
    setPlayerId(id)
  }, [])

  // Load room
  useEffect(() => {
    if (!code || !playerId) return

    async function load() {
      const { data: roomData } = await supabase
        .from('rooms')
        .select('id, status')
        .eq('code', code)
        .single()

      if (!roomData) return
      setRoom(roomData)
      setGameStatus(roomData.status)

      const { data: boxes } = await supabase
        .from('boxes')
        .select('id, metadata, timer, order_index')
        .eq('room_id', roomData.id)
        .order('order_index')

      if (boxes && boxes.length > 0) {
        setActiveBox(boxes[0])
        setTimeLeft(boxes[0].timer)
      }

      setRoomLoaded(true)
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
        setGameStatus(payload.new.status)
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

    const t = setTimeout(() => setTimeLeft(prev => (prev ?? 0) - 1), 1000)
    return () => clearTimeout(t)
  }, [gameStatus, timeLeft])

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

      setHistory(prev => [...prev, item])

      if (data.isValid) {
        setMyScore(prev => prev + (data.points || 0))
        setMyWords(prev => prev + 1)
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

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  const foundCount = activeBox?.metadata?.filter((m: WordMetadata) => m.isFound).length || 0
  const totalCount = activeBox?.metadata?.length || 0

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
                  setPlayerName(nameInput.trim())
                  setNameSet(true)
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
    <div className="min-h-screen flex flex-col p-4 max-w-lg mx-auto">
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

      {/* Word list hints */}
      {activeBox && gameStatus === 'PLAYING' && (
        <div className="mb-4 rounded-2xl p-4"
          style={{
            background: 'rgba(26,39,68,0.4)',
            border: '1px solid rgba(61,126,255,0.15)',
          }}>
          <p className="text-xs text-blue-400 uppercase tracking-widest mb-2">
            Kata yang dicari ({foundCount}/{totalCount})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {activeBox.metadata.map((m: WordMetadata) => (
              <span key={m.word}
                className="px-2 py-1 rounded-lg text-xs font-bold"
                style={{
                  fontFamily: 'Orbitron, sans-serif',
                  background: m.isFound ? 'rgba(0,255,157,0.1)' : 'rgba(61,126,255,0.08)',
                  border: `1px solid ${m.isFound ? 'rgba(0,255,157,0.3)' : 'rgba(61,126,255,0.15)'}`,
                  color: m.isFound ? '#00FF9D' : 'rgba(255,255,255,0.5)',
                  textDecoration: m.isFound ? 'line-through' : 'none',
                }}>
                {m.word}
                {m.isFound && m.foundByName && (
                  <span className="ml-1 opacity-60 text-[10px]">
                    ({m.foundByName === playerName ? 'Kamu!' : m.foundByName})
                  </span>
                )}
              </span>
            ))}
          </div>
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
      <div className="flex-1 rounded-2xl p-4"
        style={{
          background: 'rgba(26,39,68,0.3)',
          border: '1px solid rgba(61,126,255,0.1)',
        }}>
        <p className="text-xs text-blue-400 uppercase tracking-widest mb-3">Riwayat Tebakan</p>
        <HistoryList history={history} />
      </div>

      {/* Bottom padding for mobile */}
      <div className="h-6" />
    </div>
  )
}
