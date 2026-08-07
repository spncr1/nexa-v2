/*
    Ensures older deployed databases have the full structured profile schema.
    Some environments may already have user_profiles from an earlier rollout,
    so CREATE TABLE IF NOT EXISTS in migration 001 would not add missing columns.
*/

CREATE TABLE IF NOT EXISTS user_profiles (
    user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE user_profiles
    ADD COLUMN IF NOT EXISTS age VARCHAR(32),
    ADD COLUMN IF NOT EXISTS location VARCHAR(160),
    ADD COLUMN IF NOT EXISTS university VARCHAR(200),
    ADD COLUMN IF NOT EXISTS degree VARCHAR(200),
    ADD COLUMN IF NOT EXISTS year_level VARCHAR(80),
    ADD COLUMN IF NOT EXISTS semester_label VARCHAR(160),
    ADD COLUMN IF NOT EXISTS avatar_url_or_data TEXT,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
