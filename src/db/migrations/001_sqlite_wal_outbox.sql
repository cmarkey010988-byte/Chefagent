-- ============================================================================
-- ChefAgent Local-First SQLite WAL & P2P Delta-Sync Engine Migration Script
-- Version: 001_sqlite_wal_outbox.sql
-- ============================================================================

-- 1. Configure SQLite Write-Ahead Logging (WAL) Mode for Zero-Latency Local Writes
-- Allows concurrent non-blocking reads during background write transactions.
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 5000;
PRAGMA cache_size = -64000; -- 64MB memory page cache

-- 2. Ordered Mutation Outbox Table
-- Append-only queue tracking local writes with monotonically increasing sequence IDs
CREATE TABLE IF NOT EXISTS mutation_outbox (
    seq_id INTEGER PRIMARY KEY AUTOINCREMENT,
    id TEXT NOT NULL UNIQUE, -- UUIDv4
    table_name TEXT NOT NULL,
    operation TEXT NOT NULL CHECK(operation IN ('INSERT', 'UPDATE', 'DELETE')),
    payload_json TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    vector_clock TEXT NOT NULL DEFAULT '{}', -- JSON string of logical vector clock e.g. {"node_01": 14, "node_02": 8}
    created_at INTEGER NOT NULL, -- Unix Epoch timestamp in milliseconds
    sync_status TEXT NOT NULL DEFAULT 'PENDING' CHECK(sync_status IN ('PENDING', 'SYNCING', 'SYNCED', 'CONFLICT')),
    retry_count INTEGER NOT NULL DEFAULT 0,
    last_attempt_at INTEGER,
    conflict_resolution_notes TEXT
);

-- Performance Indexes for High-Frequency Outbox Queue Processing
CREATE INDEX IF NOT EXISTS idx_outbox_sync_seq ON mutation_outbox(sync_status, seq_id);
CREATE INDEX IF NOT EXISTS idx_outbox_entity ON mutation_outbox(table_name, entity_id);
CREATE INDEX IF NOT EXISTS idx_outbox_created_at ON mutation_outbox(created_at);

-- 3. Core Entity Tables with Vector Clocks & Optimistic Concurrency Controls

-- 3.1 Inventory Items
CREATE TABLE IF NOT EXISTS inventory_items (
    id TEXT PRIMARY KEY,
    ingredient_name TEXT NOT NULL,
    current_on_hand_quantity REAL NOT NULL DEFAULT 0.0,
    unit_cost REAL NOT NULL DEFAULT 0.0,
    unit_of_measure TEXT NOT NULL DEFAULT 'EA',
    storage_location TEXT NOT NULL DEFAULT 'Walk-In Cooler',
    reorder_point_quantity REAL NOT NULL DEFAULT 5.0,
    item_type TEXT NOT NULL DEFAULT 'FOOD_INGREDIENT',
    is_archived INTEGER NOT NULL DEFAULT 0,
    version_seq INTEGER NOT NULL DEFAULT 1,
    vector_clock TEXT NOT NULL DEFAULT '{}',
    updated_at INTEGER NOT NULL
);

-- 3.2 Kitchen Prep & KDS Tickets
CREATE TABLE IF NOT EXISTS kitchen_tickets (
    id TEXT PRIMARY KEY,
    table_number TEXT NOT NULL,
    server_name TEXT NOT NULL,
    station TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'IN_PREP', 'PLATED', 'PASSED', 'SERVED', '86_CANCELLED')),
    items_json TEXT NOT NULL,
    total_amount REAL NOT NULL DEFAULT 0.0,
    version_seq INTEGER NOT NULL DEFAULT 1,
    vector_clock TEXT NOT NULL DEFAULT '{}',
    updated_at INTEGER NOT NULL
);

-- 3.3 Line Prep Items
CREATE TABLE IF NOT EXISTS prep_items (
    id TEXT PRIMARY KEY,
    dish_name TEXT NOT NULL,
    target_quantity REAL NOT NULL DEFAULT 1.0,
    completed_quantity REAL NOT NULL DEFAULT 0.0,
    station TEXT NOT NULL,
    unit TEXT NOT NULL DEFAULT 'QT',
    is_completed INTEGER NOT NULL DEFAULT 0,
    version_seq INTEGER NOT NULL DEFAULT 1,
    vector_clock TEXT NOT NULL DEFAULT '{}',
    updated_at INTEGER NOT NULL
);

-- 3.4 Supplier Purchase Orders
CREATE TABLE IF NOT EXISTS purchase_orders (
    id TEXT PRIMARY KEY,
    po_number TEXT NOT NULL UNIQUE,
    vendor_name TEXT NOT NULL,
    total_cost REAL NOT NULL DEFAULT 0.0,
    status TEXT NOT NULL DEFAULT 'DRAFT',
    edi_control_number TEXT,
    version_seq INTEGER NOT NULL DEFAULT 1,
    vector_clock TEXT NOT NULL DEFAULT '{}',
    updated_at INTEGER NOT NULL
);

-- 4. Audit Log Table for Vector Clock Conflict Resolutions
CREATE TABLE IF NOT EXISTS sync_conflict_audit_logs (
    id TEXT PRIMARY KEY,
    seq_id INTEGER NOT NULL,
    entity_id TEXT NOT NULL,
    table_name TEXT NOT NULL,
    local_vector_clock TEXT NOT NULL,
    remote_vector_clock TEXT NOT NULL,
    resolution_strategy TEXT NOT NULL, -- 'REMOTE_DOMINATES', 'LOCAL_DOMINATES', 'LWW_REMOTE_TIMESTAMP', 'LWW_LOCAL_TIMESTAMP', 'TIEBREAKER_NODE_ID'
    winning_payload_json TEXT NOT NULL,
    resolved_at INTEGER NOT NULL
);
