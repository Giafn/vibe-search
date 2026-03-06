import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: Request) {
  try {
    const { playerId, playerName, roomCode } = await request.json()

    if (!playerId || !playerName || !roomCode) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get room ID
    const { data: room } = await supabase
      .from('rooms')
      .select('id')
      .eq('code', roomCode.toUpperCase())
      .single()

    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }

    // Check if player already has a submission in this room
    const { data: existingSubmission } = await supabase
      .from('submissions')
      .select('id')
      .eq('room_id', room.id)
      .eq('player_id', playerId)
      .single()

    // If player hasn't submitted anything yet, create a dummy submission to track them
    if (!existingSubmission) {
      await supabase.from('submissions').insert({
        player_id: playerId,
        player_name: playerName,
        room_id: room.id,
        word: '_JOIN_',
        is_correct: false,
        points: 0,
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error registering player:', error)
    return NextResponse.json({ error: 'Failed to register player' }, { status: 500 })
  }
}
