-- Qatra: Add facebook_url to donors + create ratings table
-- Run in Supabase SQL Editor

-- 1) Add facebook_url column to donors
ALTER TABLE donors ADD COLUMN IF NOT EXISTS facebook_url TEXT;

-- 2) Create ratings table
CREATE TABLE IF NOT EXISTS ratings (
  id BIGSERIAL PRIMARY KEY,
  stars INTEGER NOT NULL CHECK (stars >= 1 AND stars <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3) Allow anonymous inserts + public reads
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read ratings" ON ratings FOR SELECT USING (true);
CREATE POLICY "Anyone can insert ratings" ON ratings FOR INSERT WITH CHECK (true);

-- 4) Add to realtime
ALTER PUBLICATION supabase_realtime ADD TABLE ratings;
