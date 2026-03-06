'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { supabase, WordMetadata } from '@/lib/supabase'
import GridBoard from '@/components/master/GridBoard'
import Leaderboard from '@/components/master/Leaderboard'
import { calculateLeaderboard } from '@/lib/scoring'

interface Box {
  id: string
  grid: string[][]
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

interface Submission {
  player_id: string
  player_name: string
  is_correct: boolean
  points: number
}

export default function MasterRoomPage() {
  const params = useParams()
  const code = params?.code as string

  const [room, setRoom] = useState<{ id: string; status: string } | null>(null)
  const [boxes, setBoxes] = useState<Box[]>([])
  const [activeBoxIndex, setActiveBoxIndex] = useState(0)
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [leaderboard, setLeaderboard] = useState<PlayerScore[]>([])
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const [gameStatus, setGameStatus] = useState<'WAITING' | 'PLAYING' | 'FINISHED'>('WAITING')
  const [recentFind, setRecentFind] = useState<{ word: string; name: string } | null>(null)
  const [loading, setLoading] = useState(true)

  const activeBox = boxes[activeBoxIndex]

  // Load room data
  useEffect(() => {
    async function loadRoom() {
      const { data: roomData } = await supabase
        .from('rooms')
        .select('id, status')
        .eq('code', code)
        .single()

      if (!roomData) return
      setRoom(roomData)
      setGameStatus(roomData.status)

      const { data: boxData } = await supabase
        .from('boxes')
        .select('*')
        .eq('room_id', roomData.id)
        .order('order_index')

      if (boxData) setBoxes(boxData)

      const { data: subData } = await supabase
        .from('submissions')
        .select('player_id, player_name, is_correct, points')
        .eq('room_id', roomData.id)

      if (subData) {
        setSubmissions(subData)
        setLeaderboard(calculateLeaderboard(subData))
      }

      setLoading(false)
    }
    loadRoom()
  }, [code])

  // Real-time subscriptions
  useEffect(() => {
    if (!room?.id) return

    // Subscribe to box metadata changes
    const boxSub = supabase
      .channel(`boxes:${room.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'boxes',
        filter: `room_id=eq.${room.id}`,
      }, payload => {
        const updated = payload.new as Box
        setBoxes(prev => prev.map(b => b.id === updated.id ? { ...b, ...updated } : b))

        // Detect new find
        const newlyFound = (updated.metadata as WordMetadata[]).find(
          (m: WordMetadata) => m.isFound && m.foundByName
        )
        if (newlyFound) {
          setRecentFind({ word: newlyFound.word, name: newlyFound.foundByName! })
          setTimeout(() => setRecentFind(null), 3000)
        }
      })
      .subscribe()

    // Subscribe to submissions
    const subSub = supabase
      .channel(`submissions:${room.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'submissions',
        filter: `room_id=eq.${room.id}`,
      }, payload => {
        const newSub = payload.new as Submission
        setSubmissions(prev => {
          const updated = [...prev, newSub]
          setLeaderboard(calculateLeaderboard(updated))
          return updated
        })
      })
      .subscribe()

    // Subscribe to room status
    const roomSub = supabase
      .channel(`room:${room.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'rooms',
        filter: `id=eq.${room.id}`,
      }, payload => {
        setGameStatus(payload.new.status)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(boxSub)
      supabase.removeChannel(subSub)
      supabase.removeChannel(roomSub)
    }
  }, [room?.id])

  // Timer
  useEffect(() => {
    if (gameStatus !== 'PLAYING' || !activeBox) return
    setTimeLeft(activeBox.timer)

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
  }, [gameStatus, activeBoxIndex, activeBox])

  async function startGame() {
    if (!room) return
    await supabase.from('rooms').update({ status: 'PLAYING' }).eq('id', room.id)
    setGameStatus('PLAYING')
  }

  async function nextBox() {
    if (activeBoxIndex < boxes.length - 1) {
      setActiveBoxIndex(prev => prev + 1)
      setTimeLeft(boxes[activeBoxIndex + 1]?.timer || 120)
    }
  }

  const foundCount = activeBox?.metadata?.filter((m: WordMetadata) => m.isFound).length || 0
  const totalCount = activeBox?.metadata?.length || 0
  const progress = totalCount > 0 ? (foundCount / totalCount) * 100 : 0

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full border-4 border-blue-500 border-t-transparent animate-spin mx-auto mb-4" />
          <p style={{ fontFamily: 'Orbitron, sans-serif', color: '#00E5FF' }}>Memuat room...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex overflow-hidden" style={{ background: '#0A0E1A' }}>
      {/* Main Grid Area */}
      <div className="flex-1 flex flex-col p-6 overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-black tracking-widest px-4 py-2 rounded-xl"
                style={{
                  fontFamily: 'Orbitron, sans-serif',
                  background: 'linear-gradient(135deg, #3D7EFF22, #00E5FF22)',
                  border: '1px solid rgba(61,126,255,0.3)',
                  color: '#00E5FF',
                }}>
                {code}
              </span>
              <span className="text-sm px-3 py-1 rounded-full font-bold"
                style={{
                  background: gameStatus === 'PLAYING' ? 'rgba(0,255,157,0.15)' : gameStatus === 'FINISHED' ? 'rgba(255,71,87,0.15)' : 'rgba(255,179,0,0.15)',
                  color: gameStatus === 'PLAYING' ? '#00FF9D' : gameStatus === 'FINISHED' ? '#FF4757' : '#FFB300',
                  border: `1px solid ${gameStatus === 'PLAYING' ? 'rgba(0,255,157,0.3)' : 'rgba(255,179,0,0.3)'}`,
                }}>
                {gameStatus === 'PLAYING' ? '● LIVE' : gameStatus === 'FINISHED' ? '■ SELESAI' : '○ MENUNGGU'}
              </span>
            </div>
            <p className="text-xs text-blue-400 mt-1 opacity-60">
              Box {activeBoxIndex + 1}/{boxes.length} · {foundCount}/{totalCount} kata ditemukan
            </p>
          </div>

          {/* Timer */}
          {gameStatus === 'PLAYING' && timeLeft !== null && (
            <div className="text-center">
              <div className="text-5xl font-black tabular-nums"
                style={{
                  fontFamily: 'Orbitron, sans-serif',
                  color: timeLeft < 30 ? '#FF4757' : '#00E5FF',
                  textShadow: timeLeft < 30 ? '0 0 20px #FF4757' : '0 0 20px #00E5FF',
                }}>
                {formatTime(timeLeft)}
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="flex gap-3">
            {gameStatus === 'WAITING' && (
              <button onClick={startGame}
                className="px-6 py-3 rounded-xl font-bold uppercase tracking-wider transition-all hover:scale-105 active:scale-95"
                style={{
                  fontFamily: 'Orbitron, sans-serif',
                  background: 'linear-gradient(135deg, #00FF9D, #00B894)',
                  color: '#0A0E1A',
                }}>
                ▶ Start Game
              </button>
            )}
            {gameStatus === 'PLAYING' && activeBoxIndex < boxes.length - 1 && (
              <button onClick={nextBox}
                className="px-6 py-3 rounded-xl font-bold uppercase tracking-wider transition-all hover:scale-105 active:scale-95"
                style={{
                  fontFamily: 'Orbitron, sans-serif',
                  background: 'linear-gradient(135deg, #3D7EFF, #00E5FF)',
                  color: '#0A0E1A',
                }}>
                Next Box ▶▶
              </button>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-6 rounded-full h-1.5 overflow-hidden"
          style={{ background: 'rgba(61,126,255,0.1)' }}>
          <div className="h-full rounded-full transition-all duration-1000"
            style={{
              width: `${progress}%`,
              background: 'linear-gradient(90deg, #3D7EFF, #00E5FF)',
              boxShadow: '0 0 10px #3D7EFF',
            }} />
        </div>

        {/* Recent find banner */}
        {recentFind && (
          <div className="mb-4 py-3 px-6 rounded-2xl text-center animate-[popIn_0.4s_ease]"
            style={{
              background: 'rgba(255,215,0,0.15)',
              border: '1px solid rgba(255,215,0,0.4)',
              boxShadow: '0 0 30px rgba(255,215,0,0.2)',
            }}>
            <p className="font-black text-xl" style={{ fontFamily: 'Orbitron, sans-serif', color: '#FFD700' }}>
              🎉 {recentFind.name} menemukan &quot;{recentFind.word}&quot;!
            </p>
          </div>
        )}

        {/* Grid */}
        <div className="flex-1 flex items-center justify-center overflow-auto">
          {activeBox && (
            <div className="overflow-auto">
              <GridBoard
                grid={activeBox.grid}
                metadata={activeBox.metadata}
                cellSize={Math.min(44, Math.floor((window.innerWidth - 380) / (activeBox.grid[0]?.length || 10)))}
              />
            </div>
          )}
        </div>

        {/* Word list */}
        {activeBox && (
          <div className="mt-4 flex flex-wrap gap-2">
            {activeBox.metadata.map((m: WordMetadata) => (
              <span key={m.word}
                className="px-3 py-1 rounded-lg text-sm font-bold transition-all"
                style={{
                  fontFamily: 'Orbitron, sans-serif',
                  fontSize: '11px',
                  background: m.isFound ? 'rgba(0,255,157,0.1)' : 'rgba(61,126,255,0.08)',
                  border: `1px solid ${m.isFound ? 'rgba(0,255,157,0.4)' : 'rgba(61,126,255,0.2)'}`,
                  color: m.isFound ? '#00FF9D' : 'rgba(255,255,255,0.5)',
                  textDecoration: m.isFound ? 'line-through' : 'none',
                }}>
                {m.word} ({m.points}pts)
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Sidebar Leaderboard */}
      <div className="w-80 flex-shrink-0 border-l p-5 flex flex-col overflow-y-auto"
        style={{
          borderColor: 'rgba(61,126,255,0.15)',
          background: 'rgba(26,39,68,0.3)',
          backdropFilter: 'blur(10px)',
        }}>
        <h2 className="text-sm font-bold uppercase tracking-widest mb-4 flex items-center gap-2"
          style={{ fontFamily: 'Orbitron, sans-serif', color: '#FFD700' }}>
          🏆 Leaderboard
        </h2>
        <Leaderboard scores={leaderboard} />

        {/* Join info */}
        <div className="mt-auto pt-6">
          <div className="rounded-xl p-4 text-center"
            style={{
              background: 'rgba(61,126,255,0.08)',
              border: '1px solid rgba(61,126,255,0.2)',
            }}>
            <p className="text-xs text-blue-400 mb-1 uppercase tracking-widest">Gabung via</p>
            <p className="font-bold" style={{ color: '#00E5FF' }}>
              {typeof window !== 'undefined' ? window.location.host : ''}/room/play/
            </p>
            <p className="text-3xl font-black mt-1 tracking-[0.3em]"
              style={{ fontFamily: 'Orbitron, sans-serif', color: '#FFD700' }}>
              {code}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
