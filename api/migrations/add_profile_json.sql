-- Migration: Add profile_json column to user_configs
-- Date: 2026-05-19
-- Purpose: Store structured profile data for UI editing

-- Add profile_json column (JSONB for PostgreSQL, JSON for others)
ALTER TABLE user_configs
ADD COLUMN IF NOT EXISTS profile_json JSONB DEFAULT '{}';

-- Comment for documentation
COMMENT ON COLUMN user_configs.profile_json IS 'Source of truth - structured JSON for UI editing';
COMMENT ON COLUMN user_configs.profile_md IS 'Auto-generated cache - markdown for AI agents';
