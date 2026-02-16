-- ═══════════════════════════════════════════════════════════
-- Syllabus — Social Features Migration
-- Run this in your Supabase Dashboard → SQL Editor → New Query
-- ═══════════════════════════════════════════════════════════

-- 1. Extend profiles table with new columns
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS display_name text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio text DEFAULT '';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 2. Follows table (who follows whom)
CREATE TABLE IF NOT EXISTS follows (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  following_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

-- 3. Activity table (tracks library actions for feed)
CREATE TABLE IF NOT EXISTS activity (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  action text NOT NULL, -- 'added', 'rated', 'finished', 'reviewed', 'followed'
  media_type text,
  media_id text,
  title text,
  poster_url text,
  rating numeric,
  review text,
  created_at timestamptz DEFAULT now()
);

-- 4. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);
CREATE INDEX IF NOT EXISTS idx_activity_user ON activity(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_created ON activity(created_at DESC);

-- 5. Row Level Security

-- Profiles: anyone can read, only owner can update
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Follows: anyone can see follows, users can manage their own
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Follows are viewable by everyone" ON follows;
CREATE POLICY "Follows are viewable by everyone" ON follows FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can follow" ON follows;
CREATE POLICY "Users can follow" ON follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
DROP POLICY IF EXISTS "Users can unfollow" ON follows;
CREATE POLICY "Users can unfollow" ON follows FOR DELETE USING (auth.uid() = follower_id);

-- Activity: anyone can see activity, users can insert their own
ALTER TABLE activity ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Activity is viewable by everyone" ON activity;
CREATE POLICY "Activity is viewable by everyone" ON activity FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can log activity" ON activity;
CREATE POLICY "Users can log activity" ON activity FOR INSERT WITH CHECK (auth.uid() = user_id);
