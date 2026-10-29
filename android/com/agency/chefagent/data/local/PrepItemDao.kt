package com.agency.chefagent.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Transaction
import androidx.room.Update
import kotlinx.coroutines.flow.Flow

/**
 * PrepItemDao.kt
 *
 * Offline-first Data Access Object for ChefAgent kitchen prep execution.
 * Enforces Room WAL mode with Flow conflation (WhileSubscribed(5000))
 * and Last-Writer-Wins (LWW) conflict-resolved updates.
 */
@Dao
interface PrepItemDao {

    /**
     * Observes prep items ordered dynamically by Chronos targetFireTimestamp.
     * Earliest required fire times appear first, approaching the real-time Burn Line.
     */
    @Query("""
        SELECT * FROM prep_items 
        WHERE (:station = 'ALL' OR stationAssignment = :station)
        ORDER BY 
            CASE WHEN targetFireTimestamp IS NULL THEN 1 ELSE 0 END,
            targetFireTimestamp ASC,
            priorityLevel ASC
    """)
    fun observeChronosTimeline(station: String): Flow<List<PrepItemEntity>>

    @Query("SELECT * FROM prep_items ORDER BY targetFireTimestamp ASC, priorityLevel ASC")
    fun observeAllPrepItems(): Flow<List<PrepItemEntity>>

    @Query("SELECT * FROM prep_items WHERE shiftedDateTimestamp >= :startOfDayTimestamp ORDER BY targetFireTimestamp ASC")
    fun observeActivePrepItems(startOfDayTimestamp: Long): Flow<List<PrepItemEntity>>

    /**
     * Observes items scheduled for a specific banquet event
     */
    @Query("SELECT * FROM prep_items WHERE banquetEventId = :eventId ORDER BY targetFireTimestamp ASC")
    fun observeBanquetTimeline(eventId: String): Flow<List<PrepItemEntity>>

    @Query("SELECT * FROM prep_items WHERE id = :id LIMIT 1")
    suspend fun getPrepItemById(id: String): PrepItemEntity?

    @Query("SELECT last_modified_utc FROM prep_items WHERE id = :id LIMIT 1")
    suspend fun getLastModifiedTimestamp(id: String): Long?

    @Query("SELECT * FROM prep_items")
    suspend fun getAllPrepItems(): List<PrepItemEntity>

    @Query("SELECT COUNT(*) FROM prep_items")
    suspend fun getPrepItemCount(): Int

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertPrepItem(item: PrepItemEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertPrepItems(items: List<PrepItemEntity>)

    @Update
    suspend fun updatePrepItem(item: PrepItemEntity)

    /**
     * Updates completion status with LWW timestamp enforcement.
     */
    @Query("""
        UPDATE prep_items 
        SET isCompleted = :isCompleted, 
            completedQuantity = :completedQty, 
            last_modified_utc = :timestamp 
        WHERE id = :id AND last_modified_utc <= :timestamp
    """)
    suspend fun updateCompletionStatusWithLww(id: String, isCompleted: Boolean, completedQty: Double, timestamp: Long): Int

    @Query("UPDATE prep_items SET isCompleted = :isCompleted, completedQuantity = :completedQty, last_modified_utc = :timestamp WHERE id = :id")
    suspend fun updateCompletionStatus(id: String, isCompleted: Boolean, completedQty: Double, timestamp: Long = System.currentTimeMillis())

    @Query("UPDATE prep_items SET targetFireTimestamp = :targetFireTimestamp, last_modified_utc = :timestamp WHERE id = :id")
    suspend fun updateFireTimestamp(id: String, targetFireTimestamp: Long, timestamp: Long = System.currentTimeMillis())

    @Transaction
    suspend fun batchUpdateChronosSchedule(scheduledItems: List<PrepItemEntity>) {
        insertPrepItems(scheduledItems)
    }

    @Query("DELETE FROM prep_items WHERE id = :id")
    suspend fun deletePrepItemById(id: String)

    @Transaction
    suspend fun resetAndSeedPrep(items: List<PrepItemEntity>) {
        insertPrepItems(items)
    }
}
