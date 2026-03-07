-- ═══════════════════════════════════════════════════════════
-- Syllabus — Full Database Schema
-- Run sections in Supabase Dashboard → SQL Editor as needed
-- ═══════════════════════════════════════════════════════════


-- ───────────────────────────────────────────────────────────
-- 1. Extensions
-- ───────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS vector;


-- ───────────────────────────────────────────────────────────
-- 2. Profiles
-- ───────────────────────────────────────────────────────────

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS display_name text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio text DEFAULT '';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);


-- ───────────────────────────────────────────────────────────
-- 3. Library (additional columns)
-- ───────────────────────────────────────────────────────────

ALTER TABLE library ADD COLUMN IF NOT EXISTS poster_url text;
ALTER TABLE library ADD COLUMN IF NOT EXISTS backdrop_url text;
ALTER TABLE library ADD COLUMN IF NOT EXISTS genres text;
ALTER TABLE library ADD COLUMN IF NOT EXISTS external_rating numeric;
ALTER TABLE library ADD COLUMN IF NOT EXISTS user_rating numeric;
ALTER TABLE library ADD COLUMN IF NOT EXISTS review text;
ALTER TABLE library ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
ALTER TABLE library ADD COLUMN IF NOT EXISTS progress_season int;
ALTER TABLE library ADD COLUMN IF NOT EXISTS progress_episode int;
ALTER TABLE library ADD COLUMN IF NOT EXISTS progress_timestamp int;  -- seconds into movie/episode


-- ───────────────────────────────────────────────────────────
-- 4. Follows
-- ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS follows (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  following_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

CREATE INDEX IF NOT EXISTS idx_follows_follower ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following ON follows(following_id);

ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Follows are viewable by everyone" ON follows;
CREATE POLICY "Follows are viewable by everyone" ON follows FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can follow" ON follows;
CREATE POLICY "Users can follow" ON follows FOR INSERT WITH CHECK (auth.uid() = follower_id);

DROP POLICY IF EXISTS "Users can unfollow" ON follows;
CREATE POLICY "Users can unfollow" ON follows FOR DELETE USING (auth.uid() = follower_id);


-- ───────────────────────────────────────────────────────────
-- 5. Activity
-- ───────────────────────────────────────────────────────────

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

CREATE INDEX IF NOT EXISTS idx_activity_user ON activity(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_created ON activity(created_at DESC);

ALTER TABLE activity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Activity is viewable by everyone" ON activity;
CREATE POLICY "Activity is viewable by everyone" ON activity FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can log activity" ON activity;
CREATE POLICY "Users can log activity" ON activity FOR INSERT WITH CHECK (auth.uid() = user_id);


-- ───────────────────────────────────────────────────────────
-- 6. Content Metadata (synced from TMDB)
-- ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS content_metadata (
  tmdb_id       INT          NOT NULL,
  media_type    TEXT         NOT NULL CHECK (media_type IN ('movie', 'tv')),
  title         TEXT         NOT NULL,
  overview      TEXT,
  genres        TEXT[]       DEFAULT '{}',
  keywords      TEXT[]       DEFAULT '{}',
  cast_names    TEXT[]       DEFAULT '{}',
  director      TEXT,
  vote_average  FLOAT        DEFAULT 0,
  popularity    FLOAT        DEFAULT 0,
  release_year  INT,
  poster_path   TEXT,
  backdrop_path TEXT,
  embedding     vector(384),
  created_at    TIMESTAMPTZ  DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  DEFAULT NOW(),
  PRIMARY KEY (tmdb_id, media_type)
);

CREATE INDEX IF NOT EXISTS idx_content_popularity ON content_metadata (popularity DESC);
CREATE INDEX IF NOT EXISTS idx_content_vote_avg   ON content_metadata (vote_average DESC);
CREATE INDEX IF NOT EXISTS idx_content_year       ON content_metadata (release_year);
CREATE INDEX IF NOT EXISTS idx_content_media_type ON content_metadata (media_type);

ALTER TABLE content_metadata ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "content_metadata_public_read" ON content_metadata;
CREATE POLICY "content_metadata_public_read" ON content_metadata
  FOR SELECT USING (true);

-- NOTE: After 1000+ rows, create IVFFlat index for faster vector search:
-- CREATE INDEX idx_content_embedding ON content_metadata
--   USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);


-- ───────────────────────────────────────────────────────────
-- 7. User Preferences (computed from library)
-- ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  top_genres       JSONB        DEFAULT '{}',
  avg_rating       FLOAT        DEFAULT 0,
  media_type_split JSONB        DEFAULT '{}',
  taste_embedding  vector(384),
  updated_at       TIMESTAMPTZ  DEFAULT NOW()
);

ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_preferences_owner_read" ON user_preferences;
CREATE POLICY "user_preferences_owner_read" ON user_preferences
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_preferences_owner_write" ON user_preferences;
CREATE POLICY "user_preferences_owner_write" ON user_preferences
  FOR ALL USING (auth.uid() = user_id);


-- ───────────────────────────────────────────────────────────
-- 8. Search Queries (analytics)
-- ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS search_queries (
  id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  raw_query       TEXT NOT NULL,
  parsed_intent   JSONB,
  result_count    INT DEFAULT 0,
  clicked_result_id TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_search_queries_user ON search_queries (user_id, created_at DESC);

ALTER TABLE search_queries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "search_queries_owner_read" ON search_queries;
CREATE POLICY "search_queries_owner_read" ON search_queries
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "search_queries_owner_insert" ON search_queries;
CREATE POLICY "search_queries_owner_insert" ON search_queries
  FOR INSERT WITH CHECK (auth.uid() = user_id);


-- ───────────────────────────────────────────────────────────
-- 9. Functions
-- ───────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION match_content_by_embedding(
  query_embedding vector(384),
  match_count     INT DEFAULT 20,
  filter_type     TEXT DEFAULT NULL
)
RETURNS TABLE (
  tmdb_id       INT,
  media_type    TEXT,
  title         TEXT,
  overview      TEXT,
  genres        TEXT[],
  vote_average  FLOAT,
  popularity    FLOAT,
  poster_path   TEXT,
  backdrop_path TEXT,
  similarity    FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    cm.tmdb_id,
    cm.media_type,
    cm.title,
    cm.overview,
    cm.genres,
    cm.vote_average,
    cm.popularity,
    cm.poster_path,
    cm.backdrop_path,
    1 - (cm.embedding <=> query_embedding) AS similarity
  FROM content_metadata cm
  WHERE cm.embedding IS NOT NULL
    AND (filter_type IS NULL OR cm.media_type = filter_type)
  ORDER BY cm.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;


-- ───────────────────────────────────────────────────────────
-- 10. Avatar Storage
-- ───────────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152, -- 2MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 2097152,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];

DROP POLICY IF EXISTS "Public avatar read access" ON storage.objects;
CREATE POLICY "Public avatar read access"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users can upload own avatars" ON storage.objects;
CREATE POLICY "Users can upload own avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can update own avatars" ON storage.objects;
CREATE POLICY "Users can update own avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Users can delete own avatars" ON storage.objects;
CREATE POLICY "Users can delete own avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
