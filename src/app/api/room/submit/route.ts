import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin, WordMetadata } from '@/lib/supabase'
import { validateAndScore } from '@/lib/scoring'
import { v4 as uuidv4 } from 'uuid'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { word, roomCode, boxId, playerId, playerName } = body

    if (!word || !roomCode || !boxId || !playerId || !playerName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const db = supabaseAdmin()

    // Get room
    const { data: room, error: roomError } = await db
      .from('rooms')
      .select('id, status')
      .eq('code', roomCode)
      .single()

    if (roomError || !room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }

    if (room.status !== 'PLAYING') {
      return NextResponse.json({ error: 'Game is not active' }, { status: 400 })
    }

    // Get box with metadata
    const { data: box, error: boxError } = await db
      .from('boxes')
      .select('id, metadata')
      .eq('id', boxId)
      .eq('room_id', room.id)
      .single()

    if (boxError || !box) {
      return NextResponse.json({ error: 'Box not found' }, { status: 404 })
    }

    const metadata: WordMetadata[] = box.metadata

    // Validate and score
    const result = validateAndScore(word, metadata, playerId)

    // Record submission
    await db.from('submissions').insert({
      id: uuidv4(),
      player_id: playerId,
      player_name: playerName,
      room_id: room.id,
      word: word.toUpperCase().trim(),
      is_correct: result.isValid,
      points: result.isValid ? result.points : 0,
    })

    // If valid, update metadata
    if (result.isValid && result.wordMetadata) {
      const updatedMetadata = metadata.map((m: WordMetadata) => {
        if (m.word === result.wordMetadata!.word) {
          return {
            ...m,
            isFound: true,
            foundBy: playerId,
            foundByName: playerName,
          }
        }
        return m
      })

      const { error: updateError } = await db
        .from('boxes')
        .update({ metadata: updatedMetadata })
        .eq('id', boxId)

      if (updateError) {
        console.error('Metadata update error:', updateError)
      }

      // Check if all words found in current box
      const allFound = updatedMetadata.every((m: WordMetadata) => m.isFound)
      if (allFound) {
        // Get all boxes for this room to check if there's a next box
        const { data: allBoxes } = await db
          .from('boxes')
          .select('id, order_index')
          .eq('room_id', room.id)
          .order('order_index', { ascending: true })

        if (allBoxes && allBoxes.length > 1) {
          // There are multiple boxes, find the next one
          const currentBoxIndex = allBoxes.findIndex(b => b.id === boxId)
          if (currentBoxIndex < allBoxes.length - 1) {
            // Move to next box (broadcast new box via room status update or emit event)
            // For now, just notify that box is complete
            // Client will handle moving to next box
            await db
              .from('rooms')
              .update({ status: 'PLAYING' }) // Keep playing status, client will check next box
              .eq('id', room.id)
          } else {
            // Last box completed, finish the game
            await db
              .from('rooms')
              .update({ status: 'FINISHED' })
              .eq('id', room.id)
          }
        } else {
          // Only one box, finish the game
          await db
            .from('rooms')
            .update({ status: 'FINISHED' })
            .eq('id', room.id)
        }
      }
    }

    return NextResponse.json({
      success: true,
      isValid: result.isValid,
      isAlreadyFound: result.isAlreadyFound,
      points: result.points,
      message: result.message,
      wordMetadata: result.isValid ? result.wordMetadata : null,
    })
  } catch (err) {
    console.error('Submit error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
