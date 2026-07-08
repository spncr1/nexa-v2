CREATE TABLE IF NOT EXISTS email_reminder_deliveries (
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reminder_type VARCHAR(32) NOT NULL,
    period_key VARCHAR(32) NOT NULL,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    item_count INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, reminder_type, period_key),
    CONSTRAINT email_reminder_deliveries_type_allowed CHECK (reminder_type IN ('important', 'weekly')),
    CONSTRAINT email_reminder_deliveries_item_count_nonnegative CHECK (item_count >= 0)
);

CREATE INDEX IF NOT EXISTS idx_email_reminder_deliveries_user_sent
ON email_reminder_deliveries (user_id, sent_at DESC);
