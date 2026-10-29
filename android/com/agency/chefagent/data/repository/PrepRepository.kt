package com.agency.chefagent.data.repository

import com.agency.chefagent.data.local.PrepItemDao
import com.agency.chefagent.data.local.PrepItemEntity
import com.agency.chefagent.data.local.SyncOutboxDao
import com.agency.chefagent.data.local.SyncOutboxEntity
import com.agency.chefagent.sync.SyncDeltaPayload
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flowOn
import kotlinx.coroutines.withContext
import java.util.UUID

/**
 * PrepRepository.kt
 *
 * Repository coordinating BOH Line Prep execution, Room SQLite WAL persistence,
 * and immutable delta sync outbox queuing with Last-Writer-Wins (LWW) conflict resolution.
 *
 * Invariants:
 * 1. All database I/O is strictly confined to [Dispatchers.IO].
 * 2. All reactive Flow observations are flowed on [Dispatchers.IO] to prevent UI thread blockage.
 * 3. Every local mutation appends an LWW delta with a UTC timestamp to `sync_event_queue`.
 */
class PrepRepository(
    private val prepItemDao: PrepItemDao,
    private val syncOutboxDao: SyncOutboxDao,
    private val ioDispatcher: CoroutineDispatcher = Dispatchers.IO
) {

    // ========================================================================
    // Reactive Streams
    // ========================================================================

    fun observeChronosTimeline(station: String): Flow<List<PrepItemEntity>> =
        prepItemDao.observeChronosTimeline(station).flowOn(ioDispatcher)

    fun observeAllPrepItems(): Flow<List<PrepItemEntity>> =
        prepItemDao.observeAllPrepItems().flowOn(ioDispatcher)

    fun observeActivePrepItems(startOfDayTimestamp: Long): Flow<List<PrepItemEntity>> =
        prepItemDao.observeActivePrepItems(startOfDayTimestamp).flowOn(ioDispatcher)

    fun observeBanquetTimeline(eventId: String): Flow<List<PrepItemEntity>> =
        prepItemDao.observeBanquetTimeline(eventId).flowOn(ioDispatcher)

    // ========================================================================
    // Mutations (Dispatchers.IO) with Sync Delta Enqueuing
    // ========================================================================

    suspend fun updatePrepProgress(
        item: PrepItemEntity,
        completed: Boolean,
        completedQty: Double? = null,
        timestamp: Long = System.currentTimeMillis()
    ) = withContext(ioDispatcher) {
        val finalQty = completedQty ?: if (completed) item.targetQuantity else 0.0
        val updatedItem = item.copy(
            isCompleted = completed,
            completedQuantity = finalQty,
            last_modified_utc = timestamp
        )

        prepItemDao.insertPrepItem(updatedItem)

        val payloadJson = """{"id":"${item.id}","recipeName":"${item.recipeName}","isCompleted":$completed,"completedQuantity":$finalQty,"station":"${item.stationAssignment}","targetQuantity":${item.targetQuantity},"last_modified_utc":$timestamp}"""

        syncOutboxDao.enqueuePayload(
            SyncOutboxEntity(
                eventId = UUID.randomUUID().toString(),
                entityType = "PREP",
                operationType = "UPDATE_PROGRESS",
                entityId = item.id,
                payloadJson = payloadJson,
                last_modified_utc = timestamp,
                originKioskId = "kiosk-local",
                isSynced = false
            )
        )
    }

    suspend fun insertOrUpdatePrepItem(
        item: PrepItemEntity,
        timestamp: Long = System.currentTimeMillis()
    ) = withContext(ioDispatcher) {
        val stampedItem = item.copy(last_modified_utc = timestamp)
        prepItemDao.insertPrepItem(stampedItem)

        val payloadJson = """{"id":"${stampedItem.id}","recipeId":"${stampedItem.recipeId}","recipeName":"${stampedItem.recipeName}","targetQuantity":${stampedItem.targetQuantity},"completedQuantity":${stampedItem.completedQuantity},"station":"${stampedItem.stationAssignment}","priority":${stampedItem.priorityLevel},"assignedCook":"${stampedItem.assignedCookName}","last_modified_utc":$timestamp}"""

        syncOutboxDao.enqueuePayload(
            SyncOutboxEntity(
                eventId = UUID.randomUUID().toString(),
                entityType = "PREP",
                operationType = "UPSERT",
                entityId = stampedItem.id,
                payloadJson = payloadJson,
                last_modified_utc = timestamp,
                originKioskId = "kiosk-local",
                isSynced = false
            )
        )
    }

    suspend fun deletePrepItem(id: String, timestamp: Long = System.currentTimeMillis()) =
        withContext(ioDispatcher) {
            prepItemDao.deletePrepItemById(id)

            syncOutboxDao.enqueuePayload(
                SyncOutboxEntity(
                    eventId = UUID.randomUUID().toString(),
                    entityType = "PREP",
                    operationType = "DELETE",
                    entityId = id,
                    payloadJson = """{"id":"$id","deleted":true,"last_modified_utc":$timestamp}""",
                    last_modified_utc = timestamp,
                    originKioskId = "kiosk-local",
                    isSynced = false
                )
            )
        }

    // ========================================================================
    // Last-Writer-Wins (LWW) Conflict Resolution for Incoming Sync Deltas
    // ========================================================================

    /**
     * Applies an incoming sync delta from another peer kiosk using strict LWW:
     * Only applies the update if incoming delta timestamp is strictly greater than
     * the local record's last_modified_utc.
     *
     * @return true if update was applied, false if rejected as stale or redundant.
     */
    suspend fun applyIncomingDeltaLww(delta: SyncDeltaPayload): Boolean = withContext(ioDispatcher) {
        val localItem = prepItemDao.getPrepItemById(delta.entityId)
        val localTimestamp = localItem?.last_modified_utc ?: 0L

        if (delta.last_modified_utc <= localTimestamp) {
            // Drop stale delta: local record is newer or concurrent
            return@withContext false
        }

        when (delta.operationType) {
            "DELETE" -> {
                prepItemDao.deletePrepItemById(delta.entityId)
                true
            }
            "UPDATE_PROGRESS", "UPSERT" -> {
                // Parse and merge fields while preserving LWW timestamp
                val isCompleted = delta.payloadJson.contains("\"isCompleted\":true")
                val existing = localItem ?: PrepItemEntity(
                    id = delta.entityId,
                    recipeId = "remote-recipe",
                    recipeName = "Remote Item",
                    targetQuantity = 1.0,
                    completedQuantity = 0.0,
                    unitOfMeasure = "EA",
                    stationAssignment = "Sauce/Sauté",
                    priorityLevel = 2,
                    assignedCookName = "Remote Cook",
                    shiftedDateTimestamp = delta.last_modified_utc,
                    last_modified_utc = delta.last_modified_utc
                )

                val merged = existing.copy(
                    isCompleted = isCompleted,
                    completedQuantity = if (isCompleted) existing.targetQuantity else existing.completedQuantity,
                    last_modified_utc = delta.last_modified_utc
                )

                prepItemDao.insertPrepItem(merged)
                true
            }
            else -> false
        }
    }
}
