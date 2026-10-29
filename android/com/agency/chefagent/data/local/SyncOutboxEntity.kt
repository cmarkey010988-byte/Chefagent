package com.agency.chefagent.data.local

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey
import java.util.UUID

/**
 * SyncOutboxEntity.kt (Sync Event Queue)
 *
 * Room Database Entity for local SQLite WAL asynchronous sync event queue.
 * Implements a strict Last-Writer-Wins (LWW) delta conflict resolution mechanism
 * with UTC timestamp tracking [last_modified_utc] and node origin tagging [originKioskId].
 */
@Entity(
    tableName = "sync_event_queue",
    indices = [
        Index(value = ["isSynced"]),
        Index(value = ["entityType"]),
        Index(value = ["entityId"]),
        Index(value = ["last_modified_utc"])
    ]
)
data class SyncOutboxEntity(
    @PrimaryKey(autoGenerate = true)
    val sequenceId: Long = 0L,
    val eventId: String = UUID.randomUUID().toString(),
    val entityType: String, // "PREP", "INVENTORY", "EVENT", "ORDER", "PROFILE"
    val operationType: String, // "UPSERT", "UPDATE_PROGRESS", "ARCHIVE", "DELETE"
    val entityId: String,
    val payloadJson: String, // Serialized entity payload JSON
    val last_modified_utc: Long = System.currentTimeMillis(),
    val originKioskId: String = "kiosk-local",
    val isSynced: Boolean = false,
    val retryCount: Int = 0,
    val maxRetries: Int = 5,
    val zetaProofHash: String = "" // Optional cryptographic audit certificate
) {
    // Backward compatibility constructor helpers
    constructor(
        id: Long = 0L,
        payloadType: String,
        jsonPayload: String,
        zetaProofHash: String = "",
        createdAt: Long = System.currentTimeMillis(),
        retryCount: Int = 0,
        maxRetries: Int = 5,
        syncStatus: String = "PENDING"
    ) : this(
        sequenceId = id,
        eventId = UUID.randomUUID().toString(),
        entityType = payloadType,
        operationType = "UPSERT",
        entityId = UUID.randomUUID().toString(),
        payloadJson = jsonPayload,
        last_modified_utc = createdAt,
        originKioskId = "kiosk-local",
        isSynced = (syncStatus == "COMPLETED"),
        retryCount = retryCount,
        maxRetries = maxRetries,
        zetaProofHash = zetaProofHash
    )
}

enum class SyncPayloadType {
    WASTE_LOG,
    PREP_COUNT,
    CHRONOS_ACTION,
    INVENTORY_AUDIT,
    PREP_DELTA,
    INVENTORY_DELTA
}

enum class SyncStatus {
    PENDING,
    SYNCING,
    FAILED,
    COMPLETED
}
