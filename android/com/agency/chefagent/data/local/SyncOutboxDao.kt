package com.agency.chefagent.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Transaction
import androidx.room.Update
import kotlinx.coroutines.flow.Flow

/**
 * SyncOutboxDao.kt
 *
 * High-performance Data Access Object for local SQLite WAL sync event queue.
 * Supports reactive Flow observations, transactional insertions, LWW time window filters,
 * and atomic acknowledgment / purging across kitchen terminals.
 */
@Dao
interface SyncOutboxDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun enqueuePayload(outbox: SyncOutboxEntity): Long

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun enqueueBatch(events: List<SyncOutboxEntity>)

    @Query("SELECT * FROM sync_event_queue WHERE isSynced = 0 ORDER BY last_modified_utc ASC LIMIT :batchSize")
    suspend fun getPendingBatch(batchSize: Int = 50): List<SyncOutboxEntity>

    @Query("SELECT * FROM sync_event_queue WHERE isSynced = 0 ORDER BY last_modified_utc ASC")
    fun observePendingEvents(): Flow<List<SyncOutboxEntity>>

    @Query("SELECT * FROM sync_event_queue ORDER BY last_modified_utc DESC LIMIT 50")
    fun observeRecentEvents(): Flow<List<SyncOutboxEntity>>

    @Query("SELECT * FROM sync_event_queue WHERE isSynced = 0 AND retryCount < maxRetries ORDER BY last_modified_utc ASC LIMIT :batchSize")
    suspend fun getRetryableBatch(batchSize: Int = 50): List<SyncOutboxEntity>

    @Update
    suspend fun updateSyncItem(outbox: SyncOutboxEntity)

    @Query("UPDATE sync_event_queue SET isSynced = 1 WHERE eventId IN (:eventIds)")
    suspend fun markBatchCompleted(eventIds: List<String>)

    @Query("UPDATE sync_event_queue SET isSynced = 1 WHERE sequenceId IN (:sequenceIds)")
    suspend fun markSequenceCompleted(sequenceIds: List<Long>)

    @Query("DELETE FROM sync_event_queue WHERE eventId IN (:eventIds)")
    suspend fun purgeBatchItems(eventIds: List<String>): Int

    /**
     * Atomically marks records as verified and purges them from the SQLite WAL queue.
     */
    @Transaction
    suspend fun atomicallyAcknowledgeAndPurge(eventIds: List<String>): Int {
        if (eventIds.isEmpty()) return 0
        markBatchCompleted(eventIds)
        return purgeBatchItems(eventIds)
    }

    @Query("DELETE FROM sync_event_queue WHERE isSynced = 1 AND last_modified_utc < :olderThanTimestamp")
    suspend fun purgeCompletedOlderThan(olderThanTimestamp: Long): Int

    @Query("SELECT COUNT(*) FROM sync_event_queue WHERE isSynced = 0")
    suspend fun getPendingCount(): Int

    @Query("SELECT MAX(last_modified_utc) FROM sync_event_queue")
    suspend fun getLatestSyncTimestamp(): Long?
}
