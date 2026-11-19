-- Talus Mail sorting
-- Applied remotely on 2026-11-18. Kept here for reproducible setups.

ALTER TABLE messages ADD COLUMN category TEXT NOT NULL DEFAULT 'normal';
ALTER TABLE messages ADD COLUMN sort_score INTEGER NOT NULL DEFAULT 0;
ALTER TABLE messages ADD COLUMN sort_reason TEXT NOT NULL DEFAULT '';
ALTER TABLE messages ADD COLUMN sort_locked INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_messages_sort ON messages (folder, category, date);
