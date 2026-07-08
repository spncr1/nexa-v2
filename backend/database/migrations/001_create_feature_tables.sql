/*
    Creates Nexa's feature data tables:

    These tables store per-user subjects, assignments, tasks, study sessions,
    study goals, profile details, and preferences as structured PostgreSQL
    records instead of a general app-state blob.
*/

CREATE TABLE IF NOT EXISTS subjects (
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    id TEXT NOT NULL,
    name VARCHAR(160) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at_ms BIGINT,
    updated_at_ms BIGINT,
    PRIMARY KEY (user_id, id),
    CONSTRAINT subjects_name_not_blank CHECK (btrim(name) <> '')
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_subjects_user_lower_name
ON subjects (user_id, lower(name));

CREATE INDEX IF NOT EXISTS idx_subjects_user_updated
ON subjects (user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS assignments (
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    id TEXT NOT NULL,
    subject_id TEXT,
    task TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    priority VARCHAR(16) NOT NULL DEFAULT 'medium',
    status VARCHAR(32) NOT NULL DEFAULT 'not-started',
    due_date DATE,
    weighting NUMERIC(5,2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at_ms BIGINT,
    updated_at_ms BIGINT,
    PRIMARY KEY (user_id, id),
    CONSTRAINT assignments_task_not_blank CHECK (btrim(task) <> ''),
    CONSTRAINT assignments_priority_allowed CHECK (priority IN ('low', 'medium', 'high')),
    CONSTRAINT assignments_status_allowed CHECK (status IN ('not-started', 'in-progress', 'completed')),
    CONSTRAINT assignments_weighting_range CHECK (weighting IS NULL OR (weighting >= 0 AND weighting <= 100)),
    CONSTRAINT assignments_subject_fk FOREIGN KEY (user_id, subject_id)
        REFERENCES subjects(user_id, id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_assignments_user_due_date
ON assignments (user_id, due_date);

CREATE INDEX IF NOT EXISTS idx_assignments_user_status
ON assignments (user_id, status);

CREATE INDEX IF NOT EXISTS idx_assignments_user_priority
ON assignments (user_id, priority);

CREATE INDEX IF NOT EXISTS idx_assignments_user_subject
ON assignments (user_id, subject_id);

CREATE TABLE IF NOT EXISTS tasks (
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    id TEXT NOT NULL,
    title TEXT NOT NULL,
    notes TEXT NOT NULL DEFAULT '',
    priority VARCHAR(16) NOT NULL DEFAULT 'medium',
    status VARCHAR(32) NOT NULL DEFAULT 'not-started',
    done BOOLEAN NOT NULL DEFAULT FALSE,
    scheduled_date DATE,
    scheduled_time TIME,
    scheduled_hour INTEGER,
    scheduled_minute INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at_ms BIGINT,
    updated_at_ms BIGINT,
    PRIMARY KEY (user_id, id),
    CONSTRAINT tasks_title_not_blank CHECK (btrim(title) <> ''),
    CONSTRAINT tasks_priority_allowed CHECK (priority IN ('low', 'medium', 'high')),
    CONSTRAINT tasks_status_allowed CHECK (status IN ('not-started', 'in-progress', 'completed')),
    CONSTRAINT tasks_scheduled_hour_range CHECK (scheduled_hour IS NULL OR (scheduled_hour >= 0 AND scheduled_hour <= 23)),
    CONSTRAINT tasks_scheduled_minute_range CHECK (scheduled_minute IS NULL OR (scheduled_minute >= 0 AND scheduled_minute <= 59))
);

CREATE INDEX IF NOT EXISTS idx_tasks_user_scheduled_date
ON tasks (user_id, scheduled_date);

CREATE INDEX IF NOT EXISTS idx_tasks_user_status
ON tasks (user_id, status);

CREATE INDEX IF NOT EXISTS idx_tasks_user_priority
ON tasks (user_id, priority);

CREATE TABLE IF NOT EXISTS study_sessions (
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    id TEXT NOT NULL,
    collection VARCHAR(32) NOT NULL,
    title TEXT NOT NULL,
    type VARCHAR(32) NOT NULL DEFAULT 'standard',
    duration_seconds INTEGER NOT NULL,
    duration_minutes NUMERIC(8,2),
    notes TEXT NOT NULL DEFAULT '',
    status VARCHAR(32),
    queue_position INTEGER,
    remaining_seconds INTEGER,
    total_seconds INTEGER,
    source_assignment_id TEXT,
    source_session_id TEXT,
    run_id TEXT,
    is_repeating BOOLEAN NOT NULL DEFAULT FALSE,
    is_standalone BOOLEAN NOT NULL DEFAULT FALSE,
    started_at_ms BIGINT,
    last_tick_at_ms BIGINT,
    completed_at TIMESTAMPTZ,
    completed_at_ms BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at_ms BIGINT,
    updated_at_ms BIGINT,
    PRIMARY KEY (user_id, id),
    CONSTRAINT study_sessions_collection_allowed CHECK (collection IN ('queue', 'completed', 'favourite', 'active')),
    CONSTRAINT study_sessions_title_not_blank CHECK (btrim(title) <> ''),
    CONSTRAINT study_sessions_type_allowed CHECK (type IN ('deep', 'standard', 'light', 'custom')),
    CONSTRAINT study_sessions_duration_positive CHECK (duration_seconds > 0),
    CONSTRAINT study_sessions_remaining_nonnegative CHECK (remaining_seconds IS NULL OR remaining_seconds >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_study_sessions_one_active
ON study_sessions (user_id)
WHERE collection = 'active';

CREATE INDEX IF NOT EXISTS idx_study_sessions_user_collection
ON study_sessions (user_id, collection, queue_position);

CREATE INDEX IF NOT EXISTS idx_study_sessions_user_completed
ON study_sessions (user_id, completed_at DESC);

CREATE TABLE IF NOT EXISTS study_goals (
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    period VARCHAR(16) NOT NULL,
    target_sessions INTEGER NOT NULL DEFAULT 0,
    target_focus_seconds INTEGER NOT NULL DEFAULT 0,
    active_days INTEGER NOT NULL DEFAULT 0,
    focus_deep_percent INTEGER NOT NULL DEFAULT 0,
    focus_standard_percent INTEGER NOT NULL DEFAULT 0,
    focus_light_percent INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at_ms BIGINT,
    PRIMARY KEY (user_id, period),
    CONSTRAINT study_goals_period_allowed CHECK (period IN ('week', 'month')),
    CONSTRAINT study_goals_nonnegative CHECK (
        target_sessions >= 0
        AND target_focus_seconds >= 0
        AND active_days >= 0
        AND focus_deep_percent >= 0
        AND focus_standard_percent >= 0
        AND focus_light_percent >= 0
    ),
    CONSTRAINT study_goals_focus_range CHECK (
        focus_deep_percent <= 100
        AND focus_standard_percent <= 100
        AND focus_light_percent <= 100
    )
);

CREATE INDEX IF NOT EXISTS idx_study_goals_user_period
ON study_goals (user_id, period);

CREATE TABLE IF NOT EXISTS user_profiles (
    user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    age VARCHAR(32),
    location VARCHAR(160),
    university VARCHAR(200),
    degree VARCHAR(200),
    year_level VARCHAR(80),
    semester_label VARCHAR(160),
    avatar_url_or_data TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_preferences (
    user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    theme_mode VARCHAR(16) NOT NULL DEFAULT 'system',
    nav_collapsed BOOLEAN NOT NULL DEFAULT FALSE,
    nav_group_state JSONB NOT NULL DEFAULT '{}'::jsonb,
    language VARCHAR(16) NOT NULL DEFAULT 'en',
    reduced_motion BOOLEAN NOT NULL DEFAULT FALSE,
    notifications BOOLEAN NOT NULL DEFAULT TRUE,
    private_activity BOOLEAN NOT NULL DEFAULT FALSE,
    system_preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT user_preferences_theme_allowed CHECK (theme_mode IN ('system', 'light', 'dark'))
);

CREATE TABLE IF NOT EXISTS legacy_state_imports (
    user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    source_hash TEXT,
    source_updated_at TIMESTAMPTZ,
    imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
