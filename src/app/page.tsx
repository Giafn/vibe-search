'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { v4 as uuidv4 } from 'uuid'

interface BoxConfig {
  words: string
}

export default function HomePage() {
  const router = useRouter()
  const [mode, setMode] = useState<'home' | 'create' | 'join'>('home')
  const [boxes, setBoxes] = useState<BoxConfig[]>([{ words: '' }])
  const [timerMinutes, setTimerMinutes] = useState(2)  // Global timer in minutes
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [playerName, setPlayerName] = useState('')

  function addBox() {
    setBoxes([...boxes, { words: '' }])
  }

  function removeBox(index: number) {
    if (boxes.length > 1) {
      setBoxes(boxes.filter((_, i) => i !== index))
    }
  }

  function updateBoxWords(index: number, value: string) {
    const newBoxes = [...boxes]
    newBoxes[index].words = value
    setBoxes(newBoxes)
  }

  function getBoxWords(index: number) {
    if (!boxes[index].words) return []
    return boxes[index].words
      .split(/[\n,]+/)
      .map(w => w.trim().toUpperCase())
      .filter(w => w.length > 0 && /^[A-Z]+$/.test(w))
  }

  function getTotalWords() {
    return boxes.reduce((total, box) => {
      if (!box.words) return total
      const words = box.words.split(/[\n,]+/).map(w => w.trim().toUpperCase()).filter(w => w.length > 0)
      return total + words.length
    }, 0)
  }

  async function handleCreate() {
    const totalWords = getTotalWords()
    console.log('Total words:', totalWords)
    console.log('Boxes:', boxes)

    if (totalWords < 3) {
      setError('Minimal 3 kata diperlukan secara total')
      return
    }

    const processedBoxes = boxes.map(box => ({
      words: box.words
        .split(/[\n,]+/)
        .map(w => w.trim().toUpperCase())
        .filter(w => w.length > 0),
    })).filter(b => b.words.length > 0)

    console.log('Processed boxes:', processedBoxes)

    if (processedBoxes.length === 0) {
      setError('Masukkan minimal satu box dengan kata')
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
        body: JSON.stringify({ words: processedBoxes[0].words, masterId, boxes: processedBoxes, timer: timerMinutes * 60 }),
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

              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 mb-4">
                {boxes.map((box, index) => (
                  <div key={index} className="rounded-xl p-4 relative"
                    style={{
                      background: 'rgba(10,14,26,0.6)',
                      border: '1px solid rgba(61,126,255,0.2)',
                    }}>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-bold text-blue-300">
                        Grid {index + 1}
                      </h3>
                      {boxes.length > 1 && (
                        <button
                          onClick={() => removeBox(index)}
                          className="text-xs px-2 py-1 rounded-lg text-red-400 hover:text-red-300 transition-colors"
                          style={{ background: 'rgba(255,71,87,0.15)' }}>
                          ✕ Hapus
                        </button>
                      )}
                    </div>

                    <div className="mb-3">
                      <textarea
                        value={box.words}
                        onChange={e => updateBoxWords(index, e.target.value)}
                        rows={3}
                        placeholder="JAVASCRIPT&#10;REACT&#10;NEXTJS"
                        className="w-full rounded-lg p-2 text-xs font-mono resize-none focus:outline-none transition-all"
                        style={{
                          background: 'rgba(10,14,26,0.8)',
                          border: '1px solid rgba(61,126,255,0.3)',
                          color: '#00E5FF',
                          caretColor: '#00E5FF',
                        }}
                      />
                      <p className="text-xs text-blue-400 mt-1">{getBoxWords(index).length} kata</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Global Timer */}
              <div className="mb-5">
                <label className="text-xs text-blue-300 uppercase tracking-widest mb-3 block">
                  ⏱️ Timer Permainan (menit): {timerMinutes} menit
                </label>
                <input
                  type="range" min={1} max={60} step={1}
                  value={timerMinutes}
                  onChange={e => setTimerMinutes(Number(e.target.value))}
                  className="w-full accent-blue-500"
                />
              </div>

              <button
                onClick={addBox}
                className="w-full py-3 rounded-xl text-sm font-bold mb-5 transition-all hover:scale-105 active:scale-95"
                style={{
                  background: 'rgba(61,126,255,0.15)',
                  border: '1px dashed rgba(61,126,255,0.5)',
                  color: '#3D7EFF',
                }}>
                + Tambah Grid
              </button>

              <div className="rounded-lg p-3 mb-5 text-center"
                style={{ background: 'rgba(0,229,255,0.1)' }}>
                <p className="text-sm font-bold" style={{ color: '#00E5FF' }}>
                  Total: {getTotalWords()} kata di {boxes.length} grid
                </p>
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
