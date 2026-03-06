import { WordMetadata, WordCoord } from './supabase'

type Direction = {
  dx: number
  dy: number
  name: string
}

const DIRECTIONS: Direction[] = [
  { dx: 1, dy: 0, name: 'horizontal' },
  { dx: 0, dy: 1, name: 'vertical' },
  { dx: 1, dy: 1, name: 'diagonal-down' },
  { dx: 1, dy: -1, name: 'diagonal-up' },
  { dx: -1, dy: 0, name: 'horizontal-reverse' },
  { dx: 0, dy: -1, name: 'vertical-reverse' },
  { dx: -1, dy: -1, name: 'diagonal-down-reverse' },
  { dx: -1, dy: 1, name: 'diagonal-up-reverse' },
]

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

export interface GeneratedGrid {
  grid: string[][]
  metadata: WordMetadata[]
  size: number
}

function calculateGridSize(words: string[]): number {
  const longestWord = Math.max(...words.map(w => w.length))
  const totalChars = words.reduce((sum, w) => sum + w.length, 0)
  // Heuristic: size = max(longest word + 2, sqrt(totalChars * 2))
  const heuristicSize = Math.ceil(Math.sqrt(totalChars * 1.8))
  return Math.max(longestWord + 2, heuristicSize, 10)
}

function createEmptyGrid(size: number): string[][] {
  return Array.from({ length: size }, () => Array(size).fill(''))
}

function canPlace(
  grid: string[][],
  word: string,
  startX: number,
  startY: number,
  dir: Direction,
  size: number
): boolean {
  for (let i = 0; i < word.length; i++) {
    const nx = startX + dir.dx * i
    const ny = startY + dir.dy * i
    if (nx < 0 || nx >= size || ny < 0 || ny >= size) return false
    if (grid[ny][nx] !== '' && grid[ny][nx] !== word[i]) return false
  }
  return true
}

function placeWord(
  grid: string[][],
  word: string,
  startX: number,
  startY: number,
  dir: Direction
): WordCoord[] {
  const coords: WordCoord[] = []
  for (let i = 0; i < word.length; i++) {
    const nx = startX + dir.dx * i
    const ny = startY + dir.dy * i
    grid[ny][nx] = word[i]
    coords.push({ x: nx, y: ny })
  }
  return coords
}

function tryPlaceWord(
  grid: string[][],
  word: string,
  size: number
): WordCoord[] | null {
  // Shuffle directions to randomize placement
  const dirs = [...DIRECTIONS].sort(() => Math.random() - 0.5)

  // Generate all possible positions and shuffle
  const positions: Array<{ x: number; y: number }> = []
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      positions.push({ x, y })
    }
  }
  positions.sort(() => Math.random() - 0.5)

  for (const dir of dirs) {
    for (const pos of positions) {
      if (canPlace(grid, word, pos.x, pos.y, dir, size)) {
        return placeWord(grid, word, pos.x, pos.y, dir)
      }
    }
  }
  return null
}

function fillRandomLetters(grid: string[][], size: number): void {
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (grid[y][x] === '') {
        grid[y][x] = ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
      }
    }
  }
}

function calculatePoints(word: string): number {
  const len = word.length
  if (len <= 3) return 10
  if (len <= 5) return 20
  if (len <= 7) return 30
  if (len <= 9) return 50
  return 80
}

export function generateGrid(words: string[]): GeneratedGrid {
  // Normalize: uppercase, remove spaces
  const normalizedWords = words
    .map(w => w.toUpperCase().replace(/\s+/g, ''))
    .filter(w => w.length > 0)
    // Sort longest first for better placement
    .sort((a, b) => b.length - a.length)

  const size = calculateGridSize(normalizedWords)
  
  let attempts = 0
  const maxAttempts = 5

  while (attempts < maxAttempts) {
    const grid = createEmptyGrid(size)
    const metadata: WordMetadata[] = []
    let allPlaced = true

    for (const word of normalizedWords) {
      const coords = tryPlaceWord(grid, word, size)
      if (!coords) {
        allPlaced = false
        break
      }
      metadata.push({
        word,
        coords,
        isFound: false,
        foundBy: null,
        foundByName: null,
        points: calculatePoints(word),
      })
    }

    if (allPlaced) {
      fillRandomLetters(grid, size)
      return { grid, metadata, size }
    }

    attempts++
  }

  // Last resort: increase grid size
  const bigSize = size + 5
  const grid = createEmptyGrid(bigSize)
  const metadata: WordMetadata[] = []

  for (const word of normalizedWords) {
    const coords = tryPlaceWord(grid, word, bigSize)
    if (coords) {
      metadata.push({
        word,
        coords,
        isFound: false,
        foundBy: null,
        foundByName: null,
        points: calculatePoints(word),
      })
    }
  }

  fillRandomLetters(grid, bigSize)
  return { grid, metadata, size: bigSize }
}
