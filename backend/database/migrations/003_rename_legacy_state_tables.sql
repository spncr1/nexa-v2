/*
    Renames early migration bookkeeping tables:

    Older local databases may have app_state_* table names from the first pass.
    This migration standardizes those names to legacy_state_*.
*/

ALTER TABLE IF EXISTS app_state_imports
RENAME TO legacy_state_imports;

ALTER TABLE IF EXISTS app_state_migration_snapshots
RENAME TO legacy_state_snapshots;
