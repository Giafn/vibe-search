import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!

// Client-side Supabase (for realtime subscriptions)
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})

// Server-side Supabase with service role (for API routes)
export const supabaseAdmin = () => {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseAnonKey
  return createClient(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

// Types
export interface Room {
  id: string
  code: string
  master_id: string
  status: 'WAITING' | 'PLAYING' | 'FINISHED'
  created_at: string
}

export interface WordCoord {
  x: number
  y: number
}

export interface WordMetadata {
  word: string
  coords: WordCoord[]
  isFound: boolean
  foundBy: string | null
  foundByName: string | null
  points: number
}

export interface Box {
  id: string
  room_id: string
  grid: string[][]
  metadata: WordMetadata[]
  timer: number
  order_index: number
}

export interface Submission {
  id: string
  player_id: string
  player_name: string
  room_id: string
  word: string
  is_correct: boolean
  points: number
  created_at: string
}
