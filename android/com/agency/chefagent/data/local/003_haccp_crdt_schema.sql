-- Android Room / SQLite WAL Schema Migration 003
-- com.agency.chefagent.data.local.003_haccp_crdt_schema.sql
-- Immutable Cryptographic HACCP Ledger and Local CRDT Mesh Extensions

PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;

-- 1. Create Immutable Cryptographic HACCP Safety Audit Ledger table
CREATE TABLE IF NOT EXISTS haccp_safety_ledger (
    blockHeight INTEGER PRIMARY KEY NOT NULL,
    timestamp INTEGER NOT NULL,
    stationId TEXT NOT NULL,
    incidentType TEXT NOT NULL,
    itemDescription TEXT NOT NULL,
    measuredValue TEXT NOT NULL,
    thresholdValue TEXT NOT NULL,
    actionTaken TEXT NOT NULL,
    previousHash TEXT NOT NULL,
    currentHash TEXT NOT NULL UNIQUE,
    signatureVerified INTEGER NOT NULL DEFAULT 1,
    inspectorSignedBy TEXT NOT NULL DEFAULT 'AUTOMATED_VISION_AUDIT'
);

CREATE INDEX IF NOT EXISTS idx_haccp_station_timestamp ON haccp_safety_ledger(stationId, timestamp);
CREATE INDEX IF NOT EXISTS idx_haccp_incident_type ON haccp_safety_ledger(incidentType);
CREATE INDEX IF NOT EXISTS idx_haccp_hash ON haccp_safety_ledger(currentHash);

-- 2. Extend sync_event_queue for CRDT Lamport clocks and version vector support
ALTER TABLE sync_event_queue ADD COLUMN lamportTimestamp INTEGER NOT NULL DEFAULT 0;
ALTER TABLE sync_event_queue ADD COLUMN versionVectorJson TEXT NOT NULL DEFAULT '{}';
