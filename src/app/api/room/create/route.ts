import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { generateGrid } from '@/lib/grid-generator'
import { generateRoomCode } from '@/lib/room-code'
import { v4 as uuidv4 } from 'uuid'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { words, masterId, boxes: boxConfigs } = body

    if (!words || !Array.isArray(words) || words.length === 0) {
      return NextResponse.json({ error: 'Words array is required' }, { status: 400 })
    }

    const db = supabaseAdmin()

    // Generate unique room code
    let code = generateRoomCode()
    let codeExists = true
    let attempts = 0

    while (codeExists && attempts < 10) {
      const { data } = await db.from('rooms').select('code').eq('code', code).single()
      if (!data) codeExists = false
      else code = generateRoomCode()
      attempts++
    }

    const roomId = uuidv4()
    const masterUuid = masterId || uuidv4()

    // Create room
    const { error: roomError } = await db.from('rooms').insert({
      id: roomId,
      code,
      master_id: masterUuid,
      status: 'WAITING',
    })

    if (roomError) {
      console.error('Room creation error:', roomError)
      return NextResponse.json({ error: 'Failed to create room' }, { status: 500 })
    }

    // Generate boxes
    // boxConfigs is optional: [{ words: [...], timer: 120 }]
    // If not provided, use single box with all words
    const boxList = boxConfigs && boxConfigs.length > 0
      ? boxConfigs
      : [{ words, timer: 120 }]

    const boxInserts = []
    for (let i = 0; i < boxList.length; i++) {
      const boxConfig = boxList[i]
      const boxWords = boxConfig.words || words
      const timer = boxConfig.timer || 120

      const { grid, metadata } = generateGrid(boxWords)

      boxInserts.push({
        id: uuidv4(),
        room_id: roomId,
        grid,
        metadata,
        timer,
        order_index: i,
      })
    }

    const { error: boxError } = await db.from('boxes').insert(boxInserts)

    if (boxError) {
      console.error('Box creation error:', boxError)
      return NextResponse.json({ error: 'Failed to create boxes' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      room: {
        id: roomId,
        code,
        masterId: masterUuid,
        status: 'WAITING',
      },
      boxCount: boxInserts.length,
    })
  } catch (err) {
    console.error('Create room error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
