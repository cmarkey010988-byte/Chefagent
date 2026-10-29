package com.agency.chefagent.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Transaction
import kotlinx.coroutines.flow.Flow

/**
 * EventDao.kt
 *
 * Reactive Room DAO for native kitchen events and banquet schedules.
 * Consolidated under com.agency.chefagent.data.local.
 * Provides Coroutine Flow streams, range queries, and transactional updates.
 */
@Dao
interface EventDao {

    @Query("SELECT * FROM kitchen_events WHERE startTime >= :fromTimestamp ORDER BY startTime ASC")
    fun observeUpcomingEvents(fromTimestamp: Long): Flow<List<EventEntity>>

    @Query("SELECT * FROM kitchen_events WHERE startTime >= :startTimestamp AND startTime <= :endTimestamp ORDER BY startTime ASC")
    fun observeEventsForDateRange(startTimestamp: Long, endTimestamp: Long): Flow<List<EventEntity>>

    @Query("SELECT * FROM kitchen_events ORDER BY startTime ASC")
    fun observeAllEvents(): Flow<List<EventEntity>>

    @Query("SELECT * FROM kitchen_events WHERE id = :eventId LIMIT 1")
    suspend fun getEventById(eventId: String): EventEntity?

    @Query("SELECT * FROM kitchen_events")
    suspend fun getAllEvents(): List<EventEntity>

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsertEvent(event: EventEntity)

    @Query("DELETE FROM kitchen_events WHERE id = :eventId")
    suspend fun deleteEvent(eventId: String)

    @Query("UPDATE kitchen_events SET expectedGuestCount = :expected, guaranteedHeadcount = :guaranteed, updatedTimestamp = :timestamp WHERE id = :eventId")
    suspend fun updateGuestCount(eventId: String, expected: Int, guaranteed: Int, timestamp: Long = System.currentTimeMillis())

    @Query("UPDATE kitchen_events SET status = :status, updatedTimestamp = :timestamp WHERE id = :eventId")
    suspend fun updateEventStatus(eventId: String, status: String, timestamp: Long = System.currentTimeMillis())

    @Query("UPDATE kitchen_events SET isSyncedToGoogle = :isSynced, googleCalendarEventId = :googleId, lastSyncedTimestamp = :syncedTime, updatedTimestamp = :syncedTime WHERE id = :eventId")
    suspend fun updateGoogleSyncMetadata(eventId: String, isSynced: Boolean, googleId: String?, syncedTime: Long = System.currentTimeMillis())

    @Transaction
    suspend fun upsertEvents(events: List<EventEntity>) {
        for (event in events) {
            upsertEvent(event)
        }
    }
}
