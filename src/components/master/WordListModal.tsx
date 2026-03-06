'use client'

import { WordMetadata } from '@/lib/supabase'

interface Box {
  id: string
  metadata: WordMetadata[]
}

interface WordListModalProps {
  box: Box
  boxIndex: number
  totalBoxes: number
  onClose: () => void
}

export default function WordListModal({ box, boxIndex, totalBoxes, onClose }: WordListModalProps) {
  const foundWords = box.metadata.filter(m => m.isFound)
  const notFoundWords = box.metadata.filter(m => !m.isFound)

  // Group words by finder
  const wordsByFinder = new Map<string, WordMetadata[]>()
  foundWords.forEach(m => {
    const finder = m.foundByName || 'Unknown'
    if (!wordsByFinder.has(finder)) {
      wordsByFinder.set(finder, [])
    }
    wordsByFinder.get(finder)!.push(m)
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0"
        style={{ background: 'rgba(10,14,26,0.8)', backdropFilter: 'blur(8px)' }}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[80vh] overflow-auto rounded-3xl p-6 animate-[popIn_0.3s_ease]"
        style={{
          background: 'rgba(26,39,68,0.95)',
          border: '1px solid rgba(61,126,255,0.3)',
          boxShadow: '0 0 60px rgba(61,126,255,0.3)',
        }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-black tracking-wider mb-1"
              style={{ fontFamily: 'Orbitron, sans-serif', color: '#00E5FF' }}>
              📋 Daftar Kata
            </h2>
            <p className="text-sm text-blue-400">
              Box {boxIndex + 1}/{totalBoxes} · {foundWords.length}/{box.metadata.length} ditemukan
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-2xl transition-all hover:scale-110"
            style={{ background: 'rgba(255,71,87,0.2)', color: '#FF4757' }}>
            ✕
          </button>
        </div>

        {/* Progress bar */}
        <div className="mb-6 rounded-full h-2 overflow-hidden"
          style={{ background: 'rgba(61,126,255,0.1)' }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${(foundWords.length / box.metadata.length) * 100}%`,
              background: 'linear-gradient(90deg, #00FF9D, #3D7EFF)',
              boxShadow: '0 0 10px #00FF9D',
            }}
          />
        </div>

        {/* Found words by finder */}
        {wordsByFinder.size > 0 && (
          <div className="mb-6 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-blue-400">Kata yang ditemukan</h3>

            {Array.from(wordsByFinder.entries()).map(([finder, words]) => (
              <div key={finder}
                className="rounded-2xl p-4"
                style={{
                  background: 'rgba(0,255,157,0.08)',
                  border: '1px solid rgba(0,255,157,0.2)',
                }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-black"
                      style={{
                        background: 'linear-gradient(135deg, #00FF9D, #00B894)',
                        color: '#0A0E1A',
                      }}>
                      {finder.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-base" style={{ color: '#00FF9D' }}>{finder}</p>
                      <p className="text-xs text-blue-400">{words.length} kata</p>
                    </div>
                  </div>
                  <p className="text-xl font-black" style={{ color: '#FFD700' }}>
                    {words.reduce((sum, w) => sum + w.points, 0)} pts
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {words.map(m => (
                    <span key={m.word}
                      className="px-3 py-1.5 rounded-lg text-sm font-bold"
                      style={{
                        fontFamily: 'Orbitron, sans-serif',
                        background: 'rgba(0,255,157,0.15)',
                        border: '1px solid rgba(0,255,157,0.3)',
                        color: '#00FF9D',
                      }}>
                      {m.word}
                      <span className="ml-1 opacity-60 text-xs">({m.points})</span>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Not found words */}
        {notFoundWords.length > 0 && (
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-blue-400 mb-3">
              Belum ditemukan ({notFoundWords.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {notFoundWords.map(m => (
                <span key={m.word}
                  className="px-3 py-1.5 rounded-lg text-sm font-bold"
                  style={{
                    fontFamily: 'Orbitron, sans-serif',
                    background: 'rgba(61,126,255,0.08)',
                    border: '1px solid rgba(61,126,255,0.2)',
                    color: 'rgba(255,255,255,0.5)',
                  }}>
                  {m.word}
                  <span className="ml-1 opacity-60 text-xs">({m.points})</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {notFoundWords.length === 0 && wordsByFinder.size > 0 && (
          <div className="text-center py-8 rounded-2xl"
            style={{ background: 'rgba(0,255,157,0.08)' }}>
            <div className="text-4xl mb-2">🎉</div>
            <p className="font-bold text-lg" style={{ color: '#00FF9D' }}>
              Semua kata ditemukan!
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
