-- ═══════════════════════════════════════════════════════════════
-- Syllabus: Recommendation Engine & AI Search — Database Migration
-- ═══════════════════════════════════════════════════════════════

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Content metadata (synced from TMDB)
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

-- Indexes for discovery queries
CREATE INDEX IF NOT EXISTS idx_content_popularity ON content_metadata (popularity DESC);
CREATE INDEX IF NOT EXISTS idx_content_vote_avg   ON content_metadata (vote_average DESC);
CREATE INDEX IF NOT EXISTS idx_content_year       ON content_metadata (release_year);
CREATE INDEX IF NOT EXISTS idx_content_media_type ON content_metadata (media_type);

-- 3. User preferences (computed from library)
CREATE TABLE IF NOT EXISTS user_preferences (
  user_id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  top_genres       JSONB        DEFAULT '{}',
  avg_rating       FLOAT        DEFAULT 0,
  media_type_split JSONB        DEFAULT '{}',
  taste_embedding  vector(384),
  updated_at       TIMESTAMPTZ  DEFAULT NOW()
);

-- 4. Search query log (for analytics)
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

-- 5. Cosine similarity search function
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

-- 6. RLS Policies

-- content_metadata: public read
ALTER TABLE content_metadata ENABLE ROW LEVEL SECURITY;
CREATE POLICY "content_metadata_public_read" ON content_metadata
  FOR SELECT USING (true);

-- user_preferences: owner-only
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_preferences_owner_read" ON user_preferences
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_preferences_owner_write" ON user_preferences
  FOR ALL USING (auth.uid() = user_id);

-- search_queries: owner-only
ALTER TABLE search_queries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "search_queries_owner_read" ON search_queries
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "search_queries_owner_insert" ON search_queries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- NOTE: After initial data load (1000+ rows), run:
-- CREATE INDEX idx_content_embedding ON content_metadata
--   USING ivfflat (embedding vector_cosine_ops) WITH (lists = 50);
