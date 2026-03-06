'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { v4 as uuidv4 } from 'uuid'

export default function HomePage() {
  const router = useRouter()
  const [mode, setMode] = useState<'home' | 'create' | 'join'>('home')
  const [wordInput, setWordInput] = useState('')
  const [timer, setTimer] = useState(120)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [playerName, setPlayerName] = useState('')

  const words = wordInput
    .split(/[\n,]+/)
    .map(w => w.trim().toUpperCase())
    .filter(w => w.length > 0)

  async function handleCreate() {
    if (words.length < 3) {
      setError('Minimal 3 kata diperlukan')
      return
    }
    setLoading(true)
    setError('')

    const masterId = uuidv4()
    if (typeof window !== 'undefined') {
      localStorage.setItem('masterId', masterId)
    }

    try {
      const res = await fetch('/api/room/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ words, masterId, boxes: [{ words, timer }] }),
      })
      const data = await res.json()
      if (data.success) {
        router.push(`/room/master/${data.room.code}`)
      } else {
        setError(data.error || 'Gagal membuat room')
      }
    } catch {
      setError('Koneksi gagal')
    }
    setLoading(false)
  }

  function handleJoin() {
    if (!joinCode.trim() || !playerName.trim()) {
      setError('Masukkan kode room dan nama kamu')
      return
    }
    router.push(`/room/play/${joinCode.toUpperCase()}?name=${encodeURIComponent(playerName)}`)
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background grid pattern */}
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: `repeating-linear-gradient(
          0deg, transparent, transparent 60px, rgba(61,126,255,0.5) 60px, rgba(61,126,255,0.5) 61px
        ), repeating-linear-gradient(
          90deg, transparent, transparent 60px, rgba(61,126,255,0.5) 60px, rgba(61,126,255,0.5) 61px
        )`
      }} />
      
      {/* Glow orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full opacity-10 blur-3xl"
        style={{ background: 'radial-gradient(circle, #3D7EFF, transparent)' }} />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full opacity-10 blur-3xl"
        style={{ background: 'radial-gradient(circle, #00E5FF, transparent)' }} />

      <div className="relative z-10 w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #3D7EFF, #00E5FF)' }}>
              <span className="text-xl">⚡</span>
            </div>
            <h1 className="text-4xl font-black tracking-widest"
              style={{ fontFamily: 'Orbitron, sans-serif', 
                background: 'linear-gradient(90deg, #3D7EFF, #00E5FF)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              VIBE SEARCH
            </h1>
          </div>
          <p className="text-sm text-blue-300 tracking-widest uppercase opacity-70">
            Real-time Multiplayer Word Search
          </p>
        </div>

        {mode === 'home' && (
          <div className="flex flex-col gap-4 animate-[slideUp_0.5s_ease]">
            <button
              onClick={() => setMode('create')}
              className="w-full py-5 rounded-2xl font-bold text-lg tracking-wider uppercase transition-all duration-300 hover:scale-105 active:scale-95"
              style={{
                fontFamily: 'Orbitron, sans-serif',
                background: 'linear-gradient(135deg, #3D7EFF, #1A56DB)',
                boxShadow: '0 0 30px rgba(61,126,255,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
              }}>
              🎮 Buat Room Baru
            </button>
            <button
              onClick={() => setMode('join')}
              className="w-full py-5 rounded-2xl font-bold text-lg tracking-wider uppercase transition-all duration-300 hover:scale-105 active:scale-95"
              style={{
                fontFamily: 'Orbitron, sans-serif',
                background: 'linear-gradient(135deg, #1A2744, #0D1B35)',
                border: '1px solid rgba(61,126,255,0.4)',
                boxShadow: '0 0 20px rgba(61,126,255,0.1)',
              }}>
              🚀 Gabung Room
            </button>
          </div>
        )}

        {mode === 'create' && (
          <div className="animate-[slideUp_0.4s_ease]">
            <div className="rounded-3xl p-6 mb-4"
              style={{
                background: 'rgba(26,39,68,0.6)',
                border: '1px solid rgba(61,126,255,0.2)',
                backdropFilter: 'blur(20px)',
              }}>
              <h2 className="text-lg font-bold mb-5 tracking-wider"
                style={{ fontFamily: 'Orbitron, sans-serif', color: '#00E5FF' }}>
                BUAT ROOM BARU
              </h2>
              
              <div className="mb-4">
                <label className="text-xs text-blue-300 uppercase tracking-widest mb-2 block">
                  Daftar Kata (pisahkan dengan enter atau koma)
                </label>
                <textarea
                  value={wordInput}
                  onChange={e => setWordInput(e.target.value)}
                  rows={6}
                  placeholder="JAVASCRIPT&#10;REACT&#10;NEXTJS&#10;TYPESCRIPT"
                  className="w-full rounded-xl p-3 text-sm font-mono resize-none focus:outline-none transition-all"
                  style={{
                    background: 'rgba(10,14,26,0.8)',
                    border: '1px solid rgba(61,126,255,0.3)',
                    color: '#00E5FF',
                    caretColor: '#00E5FF',
                  }}
                />
                <p className="text-xs text-blue-400 mt-1">{words.length} kata</p>
              </div>

              <div className="mb-5">
                <label className="text-xs text-blue-300 uppercase tracking-widest mb-2 block">
                  Timer (detik): {timer}s
                </label>
                <input
                  type="range" min={30} max={300} step={30}
                  value={timer}
                  onChange={e => setTimer(Number(e.target.value))}
                  className="w-full accent-blue-500"
                />
              </div>

              {error && (
                <p className="text-sm mb-4 py-2 px-3 rounded-lg"
                  style={{ background: 'rgba(255,71,87,0.15)', border: '1px solid rgba(255,71,87,0.3)', color: '#FF4757' }}>
                  ⚠️ {error}
                </p>
              )}

              <div className="flex gap-3">
                <button onClick={() => setMode('home')}
                  className="flex-1 py-3 rounded-xl text-sm opacity-60 hover:opacity-100 transition-opacity"
                  style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                  ← Kembali
                </button>
                <button
                  onClick={handleCreate}
                  disabled={loading}
                  className="flex-1 py-3 rounded-xl font-bold text-sm uppercase tracking-wider transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                  style={{
                    fontFamily: 'Orbitron, sans-serif',
                    background: loading ? '#1A2744' : 'linear-gradient(135deg, #3D7EFF, #00E5FF)',
                    color: '#0A0E1A',
                  }}>
                  {loading ? '⏳ Membuat...' : '⚡ Buat Room'}
                </button>
              </div>
            </div>
          </div>
        )}

        {mode === 'join' && (
          <div className="animate-[slideUp_0.4s_ease]">
            <div className="rounded-3xl p-6"
              style={{
                background: 'rgba(26,39,68,0.6)',
                border: '1px solid rgba(61,126,255,0.2)',
                backdropFilter: 'blur(20px)',
              }}>
              <h2 className="text-lg font-bold mb-5 tracking-wider"
                style={{ fontFamily: 'Orbitron, sans-serif', color: '#00E5FF' }}>
                GABUNG ROOM
              </h2>

              <div className="mb-4">
                <label className="text-xs text-blue-300 uppercase tracking-widest mb-2 block">Nama Kamu</label>
                <input
                  type="text"
                  value={playerName}
                  onChange={e => setPlayerName(e.target.value)}
                  placeholder="Enter your name"
                  maxLength={20}
                  className="w-full rounded-xl p-3 text-sm focus:outline-none"
                  style={{
                    background: 'rgba(10,14,26,0.8)',
                    border: '1px solid rgba(61,126,255,0.3)',
                    color: 'white',
                  }}
                />
              </div>

              <div className="mb-5">
                <label className="text-xs text-blue-300 uppercase tracking-widest mb-2 block">Kode Room</label>
                <input
                  type="text"
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="ABCDE"
                  maxLength={5}
                  className="w-full rounded-xl p-3 text-center text-2xl font-black tracking-[0.5em] focus:outline-none"
                  style={{
                    fontFamily: 'Orbitron, sans-serif',
                    background: 'rgba(10,14,26,0.8)',
                    border: '1px solid rgba(61,126,255,0.3)',
                    color: '#00E5FF',
                  }}
                />
              </div>

              {error && (
                <p className="text-sm mb-4 py-2 px-3 rounded-lg"
                  style={{ background: 'rgba(255,71,87,0.15)', border: '1px solid rgba(255,71,87,0.3)', color: '#FF4757' }}>
                  ⚠️ {error}
                </p>
              )}

              <div className="flex gap-3">
                <button onClick={() => setMode('home')}
                  className="flex-1 py-3 rounded-xl text-sm opacity-60 hover:opacity-100 transition-opacity"
                  style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                  ← Kembali
                </button>
                <button
                  onClick={handleJoin}
                  className="flex-1 py-3 rounded-xl font-bold text-sm uppercase tracking-wider transition-all hover:scale-105 active:scale-95"
                  style={{
                    fontFamily: 'Orbitron, sans-serif',
                    background: 'linear-gradient(135deg, #3D7EFF, #00E5FF)',
                    color: '#0A0E1A',
                  }}>
                  🚀 Gabung!
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
