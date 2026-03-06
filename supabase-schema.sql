-- =========================================
-- Vibe Search - Database Schema
-- Run this in Supabase SQL Editor
-- =========================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Rooms table
CREATE TABLE IF NOT EXISTS rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(5) UNIQUE NOT NULL,
    master_id UUID NOT NULL,
    status VARCHAR(20) DEFAULT 'WAITING' CHECK (status IN ('WAITING', 'PLAYING', 'FINISHED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Boxes table (each room can have multiple grids)
CREATE TABLE IF NOT EXISTS boxes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
    grid JSONB NOT NULL,           -- 2D Array [['A','B'], ['C','D']]
    metadata JSONB NOT NULL,       -- [{word, coords, isFound, foundBy, foundByName, points}]
    timer INT DEFAULT 120,
    order_index INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Submissions table
CREATE TABLE IF NOT EXISTS submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    player_id UUID NOT NULL,
    player_name TEXT NOT NULL,
    room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
    word TEXT NOT NULL,
    is_correct BOOLEAN DEFAULT FALSE,
    points INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_rooms_code ON rooms(code);
CREATE INDEX IF NOT EXISTS idx_boxes_room_id ON boxes(room_id);
CREATE INDEX IF NOT EXISTS idx_submissions_room_id ON submissions(room_id);
CREATE INDEX IF NOT EXISTS idx_submissions_player_id ON submissions(player_id);

-- =========================================
-- Row Level Security (RLS) Policies
-- =========================================

-- Enable RLS
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE boxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- Allow all reads (public game data)
CREATE POLICY "Public read rooms" ON rooms FOR SELECT USING (true);
CREATE POLICY "Public read boxes" ON boxes FOR SELECT USING (true);
CREATE POLICY "Public read submissions" ON submissions FOR SELECT USING (true);

-- Only service role can write (via API routes)
CREATE POLICY "Service insert rooms" ON rooms FOR INSERT WITH CHECK (true);
CREATE POLICY "Service update rooms" ON rooms FOR UPDATE USING (true);
CREATE POLICY "Service insert boxes" ON boxes FOR INSERT WITH CHECK (true);
CREATE POLICY "Service update boxes" ON boxes FOR UPDATE USING (true);
CREATE POLICY "Service insert submissions" ON submissions FOR INSERT WITH CHECK (true);

-- =========================================
-- Realtime Publication
-- =========================================

-- Enable realtime for tables
ALTER PUBLICATION supabase_realtime ADD TABLE rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE boxes;
ALTER PUBLICATION supabase_realtime ADD TABLE submissions;
