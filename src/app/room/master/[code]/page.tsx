'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { supabase, WordMetadata } from '@/lib/supabase'
import GridBoard from '@/components/master/GridBoard'
import Leaderboard from '@/components/master/Leaderboard'
import { calculateLeaderboard } from '@/lib/scoring'
import WordListModal from '@/components/master/WordListModal'
import QRCodeModal from '@/components/master/QRCodeModal'

interface Box {
  id: string
  grid: string[][]
  metadata: WordMetadata[]
  order_index: number
  timer?: number
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

  const [room, setRoom] = useState<{ id: string; status: string; timer: number; game_started_at: string | null } | null>(null)
  const [boxes, setBoxes] = useState<Box[]>([])
  const [activeBoxIndex, setActiveBoxIndex] = useState(0)
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [leaderboard, setLeaderboard] = useState<PlayerScore[]>([])
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const [gameStatus, setGameStatus] = useState<'WAITING' | 'PLAYING' | 'FINISHED'>('WAITING')
  const [recentFind, setRecentFind] = useState<{ word: string; name: string } | null>(null)
  const [showWordList, setShowWordList] = useState(false)
  const [showQRCode, setShowQRCode] = useState(false)
  const [loading, setLoading] = useState(true)

  const activeBox = boxes[activeBoxIndex]

  // Load room data
  useEffect(() => {
    async function loadRoom() {
      const { data: roomData } = await supabase
        .from('rooms')
        .select('id, status, timer, game_started_at')
        .eq('code', code)
        .single()

      if (!roomData) return
      setRoom(roomData)
      setGameStatus(roomData.status)

      const { data: boxData } = await supabase
        .from('boxes')
        .select('id, grid, metadata, order_index')
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

      // Calculate time left based on game_started_at
      if (roomData.status === 'PLAYING' && roomData.game_started_at) {
        const startedAt = new Date(roomData.game_started_at).getTime()
        const now = Date.now()
        const elapsedSeconds = Math.floor((now - startedAt) / 1000)
        const remaining = Math.max(0, roomData.timer - elapsedSeconds)
        setTimeLeft(remaining)
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
        const oldData = payload.old as Box | undefined

        setBoxes(prev => {
          const newBoxes = prev.map(b => b.id === updated.id ? { ...b, ...updated } : b)

          // Check if box is complete and auto-advance
          const metadata = updated.metadata as WordMetadata[]
          const allFound = metadata.every((m: WordMetadata) => m.isFound)
          const currentIndex = prev.findIndex(b => b.id === updated.id)

          if (allFound && currentIndex !== -1 && currentIndex < prev.length - 1) {
            // Move to next box
            setActiveBoxIndex(currentIndex + 1)
            setTimeLeft(newBoxes[currentIndex + 1]?.timer || 120)
          }

          // Detect new find by comparing old and new metadata
          const oldMetadata = oldData?.metadata as WordMetadata[] || []

          const newlyFound = metadata.find((newWord: WordMetadata) => {
            const oldWord = oldMetadata?.find((old: WordMetadata) => old.word === newWord.word)
            // Word is newly found if: it's found now AND it wasn't found before OR the finder changed
            return newWord.isFound && (!oldWord?.isFound || oldWord.foundByName !== newWord.foundByName)
          })

          if (newlyFound && newlyFound.foundByName) {
            setRecentFind({ word: newlyFound.word, name: newlyFound.foundByName })
            setTimeout(() => setRecentFind(null), 3000)
          }

          return newBoxes
        })
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
        // If game started and game_started_at is set, calculate time left
        if (payload.new.status === 'PLAYING' && payload.new.game_started_at && !payload.old.game_started_at) {
          const startedAt = new Date(payload.new.game_started_at).getTime()
          setTimeLeft(room?.timer || 120)
        }
        // If game finished, clear timer
        if (payload.new.status === 'FINISHED') {
          setTimeLeft(0)
        }
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
    if (gameStatus !== 'PLAYING' || timeLeft === null) return
    if (timeLeft <= 0) return

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev === null || prev <= 0) {
          clearInterval(interval)
          // Auto finish game when timer reaches 0
          if (room) {
            supabase.from('rooms').update({ status: 'FINISHED' }).eq('id', room.id)
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [gameStatus, timeLeft, room])

  async function startGame() {
    if (!room) return
    const now = new Date().toISOString()
    await supabase.from('rooms').update({
      status: 'PLAYING',
      game_started_at: now,
    }).eq('id', room.id)
    setTimeLeft(room.timer)
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

  const formatTime = (s: number) => {
    const minutes = Math.floor(s / 60)
    const seconds = s % 60
    if (minutes >= 1) {
      return `${minutes}:${String(seconds).padStart(2, '0')}`
    }
    return `${seconds}s`
  }

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
              <button
                onClick={() => setShowQRCode(true)}
                className="flex items-center gap-2 text-2xl font-black tracking-widest px-4 py-2 rounded-xl transition-all hover:scale-105"
                style={{
                  fontFamily: 'Orbitron, sans-serif',
                  background: 'linear-gradient(135deg, rgba(61,126,255,0.3), rgba(0,229,255,0.3))',
                  border: '1px solid rgba(61,126,255,0.4)',
                  color: '#00E5FF',
                }}>
                {code}
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
              </button>
              <span className="text-sm px-3 py-1 rounded-full font-bold"
                style={{
                  background: gameStatus === 'PLAYING' ? 'rgba(0,255,157,0.15)' : gameStatus === 'FINISHED' ? 'rgba(255,71,87,0.15)' : 'rgba(255,179,0,0.15)',
                  color: gameStatus === 'PLAYING' ? '#00FF9D' : gameStatus === 'FINISHED' ? '#FF4757' : '#FFB300',
                  border: `1px solid ${gameStatus === 'PLAYING' ? 'rgba(0,255,157,0.3)' : 'rgba(255,179,0,0.3)'}`,
                }}>
                {gameStatus === 'PLAYING' ? '● LIVE' : gameStatus === 'FINISHED' ? '■ SELESAI' : '○ MENUNGGU'}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowWordList(true)}
                className="text-sm font-bold px-3 py-1.5 rounded-lg transition-all hover:scale-105"
                style={{
                  background: 'rgba(61,126,255,0.15)',
                  border: '1px solid rgba(61,126,255,0.3)',
                  color: '#00E5FF',
                }}>
                📋 {foundCount}/{totalCount} Kata
              </button>
            </div>
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

        {/* Grid */}
        <div className="flex-1 flex items-center justify-center overflow-auto">
          {activeBox && (
            <div className="overflow-auto">
              <GridBoard
                grid={activeBox.grid}
                metadata={activeBox.metadata}
                cellSize={Math.min(52, Math.floor((window.innerWidth - 380) / (activeBox.grid[0]?.length || 10)))}
              />
            </div>
          )}
        </div>
      </div>

      {/* Floating Recent Find Notification */}
      {recentFind && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50">
          <div
            className="py-4 px-8 rounded-2xl"
            style={{
              background: 'rgba(255,215,0,0.95)',
              border: '2px solid rgba(255,215,0,0.6)',
              boxShadow: '0 0 60px rgba(255,215,0,0.5), 0 20px 60px rgba(0,0,0,0.5)',
            }}>
            <p className="font-black text-2xl text-center" style={{ fontFamily: 'Orbitron, sans-serif', color: '#0A0E1A' }}>
              🎉 {recentFind.name} menemukan &quot;{recentFind.word}&quot;!
            </p>
          </div>
        </div>
      )}

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

      {/* Word List Modal */}
      {showWordList && activeBox && (
        <WordListModal
          box={activeBox}
          boxIndex={activeBoxIndex}
          totalBoxes={boxes.length}
          onClose={() => setShowWordList(false)}
        />
      )}

      {/* QR Code Modal */}
      {showQRCode && (
        <QRCodeModal
          code={code}
          onClose={() => setShowQRCode(false)}
        />
      )}
    </div>
  )
}
