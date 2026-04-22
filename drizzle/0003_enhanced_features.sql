-- Enhanced Features Migration
-- Adds support for content quality control, vector search, and adaptive learning

-- Add learning progress tracking table
CREATE TABLE IF NOT EXISTS user_learning_progress (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content_id INTEGER NOT NULL REFERENCES knowledge_base(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'started' CHECK (status IN ('started', 'in_progress', 'completed', 'skipped')),
  time_spent INTEGER DEFAULT 0, -- in minutes
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  feedback TEXT,
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, content_id)
);

-- Add content quality metrics table
CREATE TABLE IF NOT EXISTS content_quality_metrics (
  id SERIAL PRIMARY KEY,
  content_id INTEGER NOT NULL REFERENCES knowledge_base(id) ON DELETE CASCADE,
  completeness_score DECIMAL(3,2) DEFAULT 0.00 CHECK (completeness_score >= 0 AND completeness_score <= 1),
  reliability_score DECIMAL(3,2) DEFAULT 0.00 CHECK (reliability_score >= 0 AND reliability_score <= 1),
  credibility_score DECIMAL(3,2) DEFAULT 0.00 CHECK (credibility_score >= 0 AND credibility_score <= 1),
  richness_score DECIMAL(3,2) DEFAULT 0.00 CHECK (richness_score >= 0 AND richness_score <= 1),
  engagement_score DECIMAL(3,2) DEFAULT 0.00 CHECK (engagement_score >= 0 AND engagement_score <= 1),
  overall_score DECIMAL(3,2) DEFAULT 0.00 CHECK (overall_score >= 0 AND overall_score <= 1),
  issues JSONB DEFAULT '[]',
  recommendations JSONB DEFAULT '[]',
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'needs_revision')),
  reviewed_by VARCHAR(100),
  reviewed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(content_id)
);

-- Add expert reviews table
CREATE TABLE IF NOT EXISTS expert_reviews (
  id SERIAL PRIMARY KEY,
  content_id INTEGER NOT NULL REFERENCES knowledge_base(id) ON DELETE CASCADE,
  expert_id VARCHAR(100) NOT NULL,
  expert_name VARCHAR(200) NOT NULL,
  credentials TEXT,
  review_date TIMESTAMP DEFAULT NOW(),
  overall_rating INTEGER NOT NULL CHECK (overall_rating >= 1 AND overall_rating <= 10),
  comments TEXT,
  recommendations TEXT[],
  approved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add user learning preferences table
CREATE TABLE IF NOT EXISTS user_learning_preferences (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  preferred_difficulty VARCHAR(20) DEFAULT 'beginner' CHECK (preferred_difficulty IN ('beginner', 'intermediate', 'advanced')),
  preferred_content_types TEXT[], -- array of content types
  learning_goals TEXT[],
  time_preference VARCHAR(20) DEFAULT 'medium' CHECK (time_preference IN ('short', 'medium', 'long')),
  interests TEXT[],
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Add learning analytics table
CREATE TABLE IF NOT EXISTS learning_analytics (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL, -- 'view', 'complete', 'rate', 'share', etc.
  content_id INTEGER REFERENCES knowledge_base(id) ON DELETE SET NULL,
  session_id VARCHAR(100),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_user_learning_progress_user_id ON user_learning_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_learning_progress_content_id ON user_learning_progress(content_id);
CREATE INDEX IF NOT EXISTS idx_user_learning_progress_status ON user_learning_progress(status);

CREATE INDEX IF NOT EXISTS idx_content_quality_metrics_content_id ON content_quality_metrics(content_id);
CREATE INDEX IF NOT EXISTS idx_content_quality_metrics_overall_score ON content_quality_metrics(overall_score);
CREATE INDEX IF NOT EXISTS idx_content_quality_metrics_status ON content_quality_metrics(status);

CREATE INDEX IF NOT EXISTS idx_expert_reviews_content_id ON expert_reviews(content_id);
CREATE INDEX IF NOT EXISTS idx_expert_reviews_expert_id ON expert_reviews(expert_id);
CREATE INDEX IF NOT EXISTS idx_expert_reviews_approved ON expert_reviews(approved);

CREATE INDEX IF NOT EXISTS idx_user_learning_preferences_user_id ON user_learning_preferences(user_id);

CREATE INDEX IF NOT EXISTS idx_learning_analytics_user_id ON learning_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_learning_analytics_event_type ON learning_analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_learning_analytics_content_id ON learning_analytics(content_id);
CREATE INDEX IF NOT EXISTS idx_learning_analytics_created_at ON learning_analytics(created_at);

-- Add vector embedding support (requires pgvector extension)
-- This will be added when pgvector is installed
-- ALTER TABLE knowledge_base ADD COLUMN embedding vector(1536);

-- For now, add embedding as JSON text
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'knowledge_base' 
                 AND column_name = 'embedding_json') THEN
    ALTER TABLE knowledge_base ADD COLUMN embedding_json TEXT;
  END IF;
END $$;

-- Add content quality score to knowledge_base for quick filtering
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'knowledge_base' 
                 AND column_name = 'quality_score') THEN
    ALTER TABLE knowledge_base ADD COLUMN quality_score DECIMAL(3,2) DEFAULT 0.00;
  END IF;
END $$;

-- Add estimated read time
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'knowledge_base' 
                 AND column_name = 'estimated_read_time') THEN
    ALTER TABLE knowledge_base ADD COLUMN estimated_read_time INTEGER DEFAULT 5;
  END IF;
END $$;

-- Add content version tracking
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'knowledge_base' 
                 AND column_name = 'version') THEN
    ALTER TABLE knowledge_base ADD COLUMN version VARCHAR(20) DEFAULT '1.0';
  END IF;
END $$;

-- Add last reviewed timestamp
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'knowledge_base' 
                 AND column_name = 'last_reviewed_at') THEN
    ALTER TABLE knowledge_base ADD COLUMN last_reviewed_at TIMESTAMP;
  END IF;
END $$;

-- Create trigger for updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for new tables
CREATE TRIGGER update_user_learning_progress_updated_at BEFORE UPDATE ON user_learning_progress FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_content_quality_metrics_updated_at BEFORE UPDATE ON content_quality_metrics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_expert_reviews_updated_at BEFORE UPDATE ON expert_reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_learning_preferences_updated_at BEFORE UPDATE ON user_learning_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default learning preferences for existing users
INSERT INTO user_learning_preferences (user_id, preferred_difficulty, interests)
SELECT id, 'beginner', ARRAY['skin_care', 'health_foundation']
FROM users
WHERE id NOT IN (SELECT user_id FROM user_learning_preferences);

-- Create view for enhanced knowledge base with quality metrics
CREATE OR REPLACE VIEW enhanced_knowledge_base AS
SELECT 
    kb.*,
    cqm.overall_score as quality_score,
    cqm.status as quality_status,
    ulp.completed_at as last_completed,
    COALESCE(ulp_count.completion_count, 0) as completion_count
FROM knowledge_base kb
LEFT JOIN content_quality_metrics cqm ON kb.id = cqm.content_id
LEFT JOIN user_learning_preferences ulp ON 1=0 -- This will be filtered in queries
LEFT JOIN (
    SELECT 
        content_id, 
        COUNT(*) as completion_count,
        MAX(completed_at) as last_completed
    FROM user_learning_progress 
    WHERE status = 'completed'
    GROUP BY content_id
) ulp_count ON kb.id = ulp_count.content_id
WHERE kb.is_active = 1;

-- Add comments for documentation
COMMENT ON TABLE user_learning_progress IS 'Tracks user progress through knowledge content';
COMMENT ON TABLE content_quality_metrics IS 'Stores quality assessment metrics for knowledge content';
COMMENT ON TABLE expert_reviews IS 'Expert reviews and ratings for knowledge content';
COMMENT ON TABLE user_learning_preferences IS 'User preferences for personalized learning';
COMMENT ON TABLE learning_analytics IS 'Analytics data for learning behavior tracking';

COMMENT ON COLUMN knowledge_base.embedding_json IS 'Vector embedding for semantic search (JSON format)';
COMMENT ON COLUMN knowledge_base.quality_score IS 'Overall quality score (0-1)';
COMMENT ON COLUMN knowledge_base.estimated_read_time IS 'Estimated reading time in minutes';
COMMENT ON COLUMN knowledge_base.version IS 'Content version for tracking updates';
COMMENT ON COLUMN knowledge_base.last_reviewed_at IS 'Last time content was reviewed';
