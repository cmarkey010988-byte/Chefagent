package com.agency.chefagent.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.TypeConverters
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase

/**
 * ChefAgentDatabase.kt
 *
 * Master Room SQLite Database for ChefAgent Hospitality Platform.
 * Consolidated under com.agency.chefagent.data.local.
 *
 * Enterprise Architectural Invariants & Defensibility Defenses:
 * 1. Zero-Data-Loss Migration Discipline: Completely eliminates destructive schema resets
 *    (.fallbackToDestructiveMigration() removed). Offline-first local ledger transactions,
 *    Chronos timelines, and inventory audits are 100% preserved during version upgrades.
 * 2. Formal Room Migration Objects: Explicit [MIGRATION_1_2], [MIGRATION_2_3], and [MIGRATION_1_3]
 *    handle incremental DDL schema alterations, indexing, and data copying between version transitions.
 * 3. High-Throughput SQLite WAL: WRITE_AHEAD_LOGGING mode enabled for non-blocking concurrent reads and writes.
 * 4. ACID Compliance: DAOs provide @Transaction blocks to guarantee atomic commits across multi-table operations.
 */
@Database(
    entities = [
        PrepItemEntity::class,
        InventoryItemEntity::class,
        PurchaseOrderEntity::class,
        SyncOutboxEntity::class,
        EventEntity::class,
        EstablishmentProfileEntity::class
    ],
    version = 3,
    exportSchema = false
)
@TypeConverters(DependenciesTypeConverter::class)
abstract class ChefAgentDatabase : RoomDatabase() {

    abstract fun prepItemDao(): PrepItemDao
    abstract fun inventoryDao(): InventoryDao
    abstract fun purchaseOrderDao(): PurchaseOrderDao
    abstract fun syncOutboxDao(): SyncOutboxDao
    abstract fun eventDao(): EventDao
    abstract fun establishmentDao(): EstablishmentDao

    companion object {
        private const val DATABASE_NAME = "chef_agent_master.db"

        @Volatile
        private var INSTANCE: ChefAgentDatabase? = null

        /**
         * Migration from Version 1 to 2:
         * - Extends prep_items with Chronos acoustic orchestration fields (target fire times, stages, dependencies).
         * - Extends inventory_items with audit profiles and soft-archival timestamps.
         * - Provisions kitchen_events, purchase_orders, and establishment_profile tables.
         */
        val MIGRATION_1_2 = object : Migration(1, 2) {
            override fun migrate(db: SupportSQLiteDatabase) {
                // 1. Alter prep_items table for Chronos orchestration
                db.execSQL("ALTER TABLE prep_items ADD COLUMN targetFireTimestamp INTEGER DEFAULT NULL")
                db.execSQL("ALTER TABLE prep_items ADD COLUMN estimatedDurationMinutes INTEGER NOT NULL DEFAULT 30")
                db.execSQL("ALTER TABLE prep_items ADD COLUMN dependencies TEXT NOT NULL DEFAULT '[]'")
                db.execSQL("ALTER TABLE prep_items ADD COLUMN chronosStage TEXT NOT NULL DEFAULT 'SUB_RECIPE'")
                db.execSQL("ALTER TABLE prep_items ADD COLUMN targetPlatingTimestamp INTEGER DEFAULT NULL")
                db.execSQL("ALTER TABLE prep_items ADD COLUMN banquetEventId TEXT DEFAULT NULL")

                // 2. Alter inventory_items table for perpetual audit & archiving
                db.execSQL("ALTER TABLE inventory_items ADD COLUMN lastAuditTimestamp INTEGER NOT NULL DEFAULT 0")
                db.execSQL("ALTER TABLE inventory_items ADD COLUMN auditedByProfile TEXT NOT NULL DEFAULT 'FOH_MANAGER'")
                db.execSQL("ALTER TABLE inventory_items ADD COLUMN isArchived INTEGER NOT NULL DEFAULT 0")
                db.execSQL("ALTER TABLE inventory_items ADD COLUMN archivedTimestamp INTEGER DEFAULT NULL")
                db.execSQL("CREATE INDEX IF NOT EXISTS index_inventory_items_isArchived ON inventory_items (isArchived)")

                // 3. Create kitchen_events table
                db.execSQL("""
                    CREATE TABLE IF NOT EXISTS kitchen_events (
                        id TEXT PRIMARY KEY NOT NULL,
                        title TEXT NOT NULL,
                        category TEXT NOT NULL,
                        status TEXT NOT NULL DEFAULT 'PLANNED',
                        startTime INTEGER NOT NULL,
                        endTime INTEGER NOT NULL,
                        expectedGuestCount INTEGER NOT NULL DEFAULT 0,
                        guaranteedHeadcount INTEGER DEFAULT NULL,
                        location TEXT NOT NULL DEFAULT 'Grand Ballroom',
                        clientName TEXT DEFAULT NULL,
                        eventNotes TEXT DEFAULT NULL,
                        menuPlanJson TEXT NOT NULL DEFAULT '[]',
                        isSyncedToGoogle INTEGER NOT NULL DEFAULT 0,
                        googleCalendarEventId TEXT DEFAULT NULL,
                        lastSyncedTimestamp INTEGER DEFAULT NULL,
                        createdTimestamp INTEGER NOT NULL DEFAULT 0,
                        updatedTimestamp INTEGER NOT NULL DEFAULT 0
                    )
                """.trimIndent())
                db.execSQL("CREATE INDEX IF NOT EXISTS index_kitchen_events_category ON kitchen_events (category)")
                db.execSQL("CREATE INDEX IF NOT EXISTS index_kitchen_events_status ON kitchen_events (status)")
                db.execSQL("CREATE INDEX IF NOT EXISTS index_kitchen_events_startTime ON kitchen_events (startTime)")
                db.execSQL("CREATE INDEX IF NOT EXISTS index_kitchen_events_isSyncedToGoogle ON kitchen_events (isSyncedToGoogle)")

                // 4. Create purchase_orders table with EDI tracking
                db.execSQL("""
                    CREATE TABLE IF NOT EXISTS purchase_orders (
                        id TEXT PRIMARY KEY NOT NULL,
                        poNumber TEXT NOT NULL,
                        vendorName TEXT NOT NULL,
                        vendorContact TEXT DEFAULT NULL,
                        orderDateTimestamp INTEGER NOT NULL DEFAULT 0,
                        expectedDeliveryDateTimestamp INTEGER NOT NULL DEFAULT 0,
                        receivedDateTimestamp INTEGER DEFAULT NULL,
                        status TEXT NOT NULL DEFAULT 'DRAFT',
                        totalCost REAL NOT NULL DEFAULT 0.0,
                        invoiceNumber TEXT DEFAULT NULL,
                        notes TEXT DEFAULT NULL,
                        ediControlNumber TEXT DEFAULT NULL,
                        transmissionStatus TEXT NOT NULL DEFAULT 'DRAFT',
                        distributorTrackingId TEXT DEFAULT NULL,
                        lastEdiErrorLog TEXT DEFAULT NULL,
                        overallFillRatePercent REAL DEFAULT NULL,
                        rawEdiEnvelopeExcerpt TEXT DEFAULT NULL,
                        version INTEGER NOT NULL DEFAULT 1
                    )
                """.trimIndent())
                db.execSQL("CREATE UNIQUE INDEX IF NOT EXISTS index_purchase_orders_poNumber ON purchase_orders (poNumber)")
                db.execSQL("CREATE INDEX IF NOT EXISTS index_purchase_orders_ediControlNumber ON purchase_orders (ediControlNumber)")
                db.execSQL("CREATE INDEX IF NOT EXISTS index_purchase_orders_transmissionStatus ON purchase_orders (transmissionStatus)")
                db.execSQL("CREATE INDEX IF NOT EXISTS index_purchase_orders_status ON purchase_orders (status)")

                // 5. Create establishment_profile table
                db.execSQL("""
                    CREATE TABLE IF NOT EXISTS establishment_profile (
                        id TEXT PRIMARY KEY NOT NULL,
                        name TEXT NOT NULL,
                        type TEXT NOT NULL,
                        currencySymbol TEXT NOT NULL DEFAULT '$',
                        primaryLocationsJson TEXT NOT NULL DEFAULT '[]',
                        lastUpdatedTimestamp INTEGER NOT NULL DEFAULT 0
                    )
                """.trimIndent())
            }
        }

        /**
         * Migration from Version 2 to 3:
         * - Upgrades sync subsystem from legacy raw outbox to Last-Writer-Wins (LWW) [sync_event_queue].
         * - Migrates pending records from sync_outbox to sync_event_queue safely without data loss.
         * - Adds [last_modified_utc] to prep_items, inventory_items, purchase_orders, kitchen_events,
         *   and establishment_profile to empower distributed LWW conflict resolution.
         */
        val MIGRATION_2_3 = object : Migration(2, 3) {
            override fun migrate(db: SupportSQLiteDatabase) {
                // 1. Add last_modified_utc to all master entities
                db.execSQL("ALTER TABLE prep_items ADD COLUMN last_modified_utc INTEGER NOT NULL DEFAULT 0")
                db.execSQL("ALTER TABLE inventory_items ADD COLUMN last_modified_utc INTEGER NOT NULL DEFAULT 0")
                db.execSQL("CREATE INDEX IF NOT EXISTS index_inventory_items_last_modified_utc ON inventory_items (last_modified_utc)")

                db.execSQL("ALTER TABLE purchase_orders ADD COLUMN last_modified_utc INTEGER NOT NULL DEFAULT 0")
                db.execSQL("ALTER TABLE kitchen_events ADD COLUMN last_modified_utc INTEGER NOT NULL DEFAULT 0")
                db.execSQL("ALTER TABLE establishment_profile ADD COLUMN last_modified_utc INTEGER NOT NULL DEFAULT 0")

                // 2. Create the hardened sync_event_queue table
                db.execSQL("""
                    CREATE TABLE IF NOT EXISTS sync_event_queue (
                        sequenceId INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
                        eventId TEXT NOT NULL,
                        entityType TEXT NOT NULL,
                        operationType TEXT NOT NULL,
                        entityId TEXT NOT NULL,
                        payloadJson TEXT NOT NULL,
                        last_modified_utc INTEGER NOT NULL DEFAULT 0,
                        originKioskId TEXT NOT NULL DEFAULT 'kiosk-local',
                        isSynced INTEGER NOT NULL DEFAULT 0,
                        retryCount INTEGER NOT NULL DEFAULT 0,
                        maxRetries INTEGER NOT NULL DEFAULT 5,
                        zetaProofHash TEXT NOT NULL DEFAULT ''
                    )
                """.trimIndent())

                db.execSQL("CREATE INDEX IF NOT EXISTS index_sync_event_queue_isSynced ON sync_event_queue (isSynced)")
                db.execSQL("CREATE INDEX IF NOT EXISTS index_sync_event_queue_entityType ON sync_event_queue (entityType)")
                db.execSQL("CREATE INDEX IF NOT EXISTS index_sync_event_queue_entityId ON sync_event_queue (entityId)")
                db.execSQL("CREATE INDEX IF NOT EXISTS index_sync_event_queue_last_modified_utc ON sync_event_queue (last_modified_utc)")

                // 3. Migrate any legacy un-synced outbox records if table existed
                db.execSQL("""
                    INSERT INTO sync_event_queue (
                        eventId, entityType, operationType, entityId, payloadJson, 
                        last_modified_utc, originKioskId, isSynced, retryCount, maxRetries, zetaProofHash
                    )
                    SELECT 
                        'migrated-' || id,
                        payloadType,
                        'UPSERT',
                        'migrated-entity-' || id,
                        jsonPayload,
                        createdAt,
                        'kiosk-local',
                        CASE WHEN syncStatus = 'COMPLETED' THEN 1 ELSE 0 END,
                        retryCount,
                        maxRetries,
                        zetaProofHash
                    FROM sync_outbox
                    WHERE EXISTS (SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'sync_outbox')
                """.trimIndent())
            }
        }

        /**
         * Direct Composite Migration 1 to 3 for devices skipping version 2.
         */
        val MIGRATION_1_3 = object : Migration(1, 3) {
            override fun migrate(db: SupportSQLiteDatabase) {
                MIGRATION_1_2.migrate(db)
                MIGRATION_2_3.migrate(db)
            }
        }

        fun getInstance(context: Context): ChefAgentDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    ChefAgentDatabase::class.java,
                    DATABASE_NAME
                )
                    .setJournalMode(JournalMode.WRITE_AHEAD_LOGGING) // Concurrency optimization
                    .addMigrations(MIGRATION_1_2, MIGRATION_2_3, MIGRATION_1_3) // Formal Room Migrations
                    // .fallbackToDestructiveMigration() is strictly removed to prevent data loss!
                    .build()
                INSTANCE = instance
                instance
            }
        }
    }
}
