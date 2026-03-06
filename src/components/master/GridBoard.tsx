'use client'

import { useEffect, useRef, useState } from 'react'
import { WordMetadata, WordCoord } from '@/lib/supabase'

interface FloatingName {
  id: string
  name: string
  x: number
  y: number
}

interface GridBoardProps {
  grid: string[][]
  metadata: WordMetadata[]
  cellSize?: number
}

const PLAYER_COLORS = [
  '#00E5FF', '#FFD700', '#00FF9D', '#FF6B6B', '#FF9F43',
  '#A29BFE', '#FD79A8', '#55EFC4', '#FDCB6E', '#E17055',
]

function getPlayerColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return PLAYER_COLORS[Math.abs(hash) % PLAYER_COLORS.length]
}

function coordsToSet(coords: WordCoord[]): Set<string> {
  return new Set(coords.map(c => `${c.x},${c.y}`))
}

export default function GridBoard({ grid, metadata, cellSize = 44 }: GridBoardProps) {
  const [floatingNames, setFloatingNames] = useState<FloatingName[]>([])
  const [prevMetadata, setPrevMetadata] = useState<WordMetadata[]>([])
  const containerRef = useRef<HTMLDivElement>(null)

  // Detect newly found words and trigger floating name animation
  useEffect(() => {
    const newlyFound = metadata.filter(m => {
      if (!m.isFound || !m.foundByName) return false
      const prev = prevMetadata.find(p => p.word === m.word)
      return !prev || !prev.isFound
    })

    if (newlyFound.length > 0) {
      const newFloats: FloatingName[] = newlyFound.map(m => {
        // Find center coord of word
        const centerCoord = m.coords[Math.floor(m.coords.length / 2)]
        return {
          id: `${m.word}-${Date.now()}`,
          name: `${m.foundByName} +${m.points}`,
          x: centerCoord.x,
          y: centerCoord.y,
        }
      })

      setFloatingNames(prev => [...prev, ...newFloats])
      setTimeout(() => {
        setFloatingNames(prev =>
          prev.filter(f => !newFloats.find(nf => nf.id === f.id))
        )
      }, 2600)
    }

    setPrevMetadata(metadata)
  }, [metadata])

  // Build found cells map
  const foundCellsMap = new Map<string, { word: WordMetadata; color: string }>()
  for (const m of metadata) {
    if (m.isFound && m.foundByName) {
      const color = getPlayerColor(m.foundByName)
      const coordSet = coordsToSet(m.coords)
      coordSet.forEach(key => {
        foundCellsMap.set(key, { word: m, color })
      })
    }
  }

  if (!grid || grid.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-blue-400">
        <div className="text-center">
          <div className="text-4xl mb-2">⏳</div>
          <p>Memuat grid...</p>
        </div>
      </div>
    )
  }

  const rows = grid.length
  const cols = grid[0]?.length || 0

  return (
    <div ref={containerRef} className="relative inline-block">
      {/* Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${cols}, ${cellSize}px)`,
          gridTemplateRows: `repeat(${rows}, ${cellSize}px)`,
          gap: '2px',
        }}>
        {grid.map((row, y) =>
          row.map((letter, x) => {
            const key = `${x},${y}`
            const foundInfo = foundCellsMap.get(key)
            const isFound = !!foundInfo

            return (
              <div
                key={key}
                className="grid-cell"
                style={{
                  width: cellSize,
                  height: cellSize,
                  fontSize: cellSize * 0.38,
                  borderRadius: '6px',
                  ...(isFound ? {
                    background: `${foundInfo.color}22`,
                    borderColor: foundInfo.color,
                    color: foundInfo.color,
                    boxShadow: `0 0 10px ${foundInfo.color}44`,
                  } : {}),
                  transition: 'all 0.3s ease',
                }}>
                {letter}
              </div>
            )
          })
        )}
      </div>

      {/* Floating names */}
      {floatingNames.map(float => (
        <div
          key={float.id}
          className="float-winner"
          style={{
            left: float.x * (cellSize + 2) + cellSize / 2,
            top: float.y * (cellSize + 2),
            pointerEvents: 'none',
            position: 'absolute',
            zIndex: 50,
          }}>
          🎉 {float.name}
        </div>
      ))}
    </div>
  )
}
