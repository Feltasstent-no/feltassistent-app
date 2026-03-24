/*
  # Create AI Competition Summaries Table

  1. New Tables
    - `competition_ai_summaries`
      - `id` (uuid, primary key)
      - `entry_id` (uuid, references competition_entries)
      - `user_id` (uuid, references auth.users)
      - `summary_json` (jsonb) - Structured AI response
      - `model_used` (text) - AI model identifier
      - `data_quality` (text) - complete, partial, minimal
      - `tokens_used` (integer) - For cost tracking
      - `version` (integer) - For regeneration tracking
      - `is_active` (boolean) - Current version flag
      - `generated_at` (timestamptz)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS
    - Users can only read their own summaries
    - Users can only insert their own summaries
    - Unique constraint for one active summary per entry

  3. Indexes
    - Index on entry_id for fast lookups
    - Index on user_id for user queries
    - Index on active summaries per entry
*/

CREATE TABLE IF NOT EXISTS competition_ai_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID NOT NULL REFERENCES competition_entries(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),

  -- AI-generated content
  summary_json JSONB NOT NULL,

  -- Metadata
  model_used TEXT NOT NULL,
  data_quality TEXT NOT NULL CHECK (data_quality IN ('complete', 'partial', 'minimal')),
  tokens_used INTEGER,

  -- Versioning for regeneration
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Timestamps
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ai_summaries_entry ON competition_ai_summaries(entry_id);
CREATE INDEX IF NOT EXISTS idx_ai_summaries_user ON competition_ai_summaries(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_summaries_active ON competition_ai_summaries(entry_id, is_active) WHERE is_active = true;

-- Unique constraint: only one active summary per entry
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_summary_per_entry
  ON competition_ai_summaries(entry_id)
  WHERE is_active = true;

-- Enable RLS
ALTER TABLE competition_ai_summaries ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own summaries"
  ON competition_ai_summaries FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own summaries"
  ON competition_ai_summaries FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own summaries"
  ON competition_ai_summaries FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
