-- SQLite / Postgres Migration 002
-- Vision Telemetry and Multimodal BOH Sensor Extensions

PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;

-- Extend prep_items table with computer vision telemetry columns
ALTER TABLE prep_items ADD COLUMN visionStationId TEXT DEFAULT NULL;
ALTER TABLE prep_items ADD COLUMN detectedItemClass TEXT DEFAULT NULL;
ALTER TABLE prep_items ADD COLUMN fillLevelPercentage REAL NOT NULL DEFAULT 100.0;
ALTER TABLE prep_items ADD COLUMN anomalyFlag INTEGER NOT NULL DEFAULT 0;
ALTER TABLE prep_items ADD COLUMN lastVisualTimestamp INTEGER DEFAULT NULL;

-- Composite indices for real-time station fill-level monitoring
CREATE INDEX IF NOT EXISTS idx_prep_items_vision_station ON prep_items(visionStationId, fillLevelPercentage);
CREATE INDEX IF NOT EXISTS idx_prep_items_anomaly ON prep_items(anomalyFlag, lastVisualTimestamp);
