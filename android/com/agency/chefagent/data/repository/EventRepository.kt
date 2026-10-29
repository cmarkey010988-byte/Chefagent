package com.agency.chefagent.data.repository

import com.agency.chefagent.data.local.EventDao
import com.agency.chefagent.data.local.EventEntity
import com.agency.chefagent.data.local.SyncOutboxDao
import com.agency.chefagent.data.local.SyncOutboxEntity
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.withContext
import java.util.UUID

/**
 * EventRepository.kt
 *
 * Repository managing native kitchen event schedules and WAL sync outbox entries.
 * Consolidated under com.agency.chefagent.data.repository.
 * All write operations execute on Dispatchers.IO.
 */
class EventRepository(
    private val eventDao: EventDao,
    private val syncOutboxDao: SyncOutboxDao,
    private val ioDispatcher: CoroutineDispatcher = Dispatchers.IO
) {

    fun observeUpcomingEvents(fromTimestamp: Long = System.currentTimeMillis()): Flow<List<EventEntity>> =
        eventDao.observeUpcomingEvents(fromTimestamp)

    fun observeEventsForDateRange(startTimestamp: Long, endTimestamp: Long): Flow<List<EventEntity>> =
        eventDao.observeEventsForDateRange(startTimestamp, endTimestamp)

    fun observeAllEvents(): Flow<List<EventEntity>> =
        eventDao.observeAllEvents()

    suspend fun upsertEvent(event: EventEntity) = withContext(ioDispatcher) {
        val now = System.currentTimeMillis()
        val stampedEvent = event.copy(updatedTimestamp = now)
        eventDao.upsertEvent(stampedEvent)

        // WAL Outbox Queue enqueue
        syncOutboxDao.enqueuePayload(
            SyncOutboxEntity(
                id = UUID.randomUUID().toString(),
                entityType = "KITCHEN_EVENT",
                operationType = "UPSERT",
                payloadJson = """{"id":"${stampedEvent.id}","title":"${stampedEvent.title}","category":"${stampedEvent.category}","status":"${stampedEvent.status}","start":${stampedEvent.startTime},"end":${stampedEvent.endTime},"expectedGuests":${stampedEvent.expectedGuestCount},"guaranteedGuests":${stampedEvent.guaranteedHeadcount ?: 0},"location":"${stampedEvent.location}"}""",
                createdAt = now
            )
        )
    }

    suspend fun deleteEvent(eventId: String) = withContext(ioDispatcher) {
        val now = System.currentTimeMillis()
        eventDao.deleteEvent(eventId)

        syncOutboxDao.enqueuePayload(
            SyncOutboxEntity(
                id = UUID.randomUUID().toString(),
                entityType = "KITCHEN_EVENT",
                operationType = "DELETE",
                payloadJson = """{"id":"$eventId"}""",
                createdAt = now
            )
        )
    }

    suspend fun updateGuestCount(eventId: String, expected: Int, guaranteed: Int) = withContext(ioDispatcher) {
        eventDao.updateGuestCount(eventId, expected, guaranteed)
    }

    suspend fun updateGoogleSyncMetadata(eventId: String, isSynced: Boolean, googleId: String?) = withContext(ioDispatcher) {
        eventDao.updateGoogleSyncMetadata(eventId, isSynced, googleId)
    }
}
