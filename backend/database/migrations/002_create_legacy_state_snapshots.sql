/*
    Creates the legacy state snapshot table:

    This preserves a copy of old migrated state so existing data can be audited
    or recovered if a legacy-to-feature-table import needs to be checked.
*/

CREATE TABLE IF NOT EXISTS legacy_state_snapshots (
    user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    storage JSONB NOT NULL DEFAULT '{}'::jsonb,
    captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
