-- Android Room / SQLite WAL Schema Copy
-- com.agency.chefagent.data.local.001_sqlite_wal_outbox.sql

PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;

CREATE TABLE IF NOT EXISTS mutation_outbox (
    seq_id INTEGER PRIMARY KEY AUTOINCREMENT,
    id TEXT NOT NULL UNIQUE,
    table_name TEXT NOT NULL,
    operation TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    vector_clock TEXT NOT NULL DEFAULT '{}',
    created_at INTEGER NOT NULL,
    sync_status TEXT NOT NULL DEFAULT 'PENDING',
    retry_count INTEGER NOT NULL DEFAULT 0,
    last_attempt_at INTEGER,
    conflict_resolution_notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_outbox_sync_seq ON mutation_outbox(sync_status, seq_id);
