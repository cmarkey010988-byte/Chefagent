package com.agency.chefagent.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Transaction
import androidx.room.Update
import kotlinx.coroutines.flow.Flow

/**
 * InventoryDao.kt
 *
 * Reactive Room Data Access Object for ChefAgent's perpetual inventory system.
 * Consolidated under com.agency.chefagent.data.local.
 * Enforces SQLite WAL concurrency, reactive Flow streams, transactional batch mutations,
 * and Last-Writer-Wins (LWW) conflict resolution via last_modified_utc.
 */
@Dao
interface InventoryDao {

    // ========================================================================
    // 1. Reactive Flow Observations (conflated with WhileSubscribed)
    // ========================================================================

    @Query("SELECT * FROM inventory_items WHERE isArchived = 0 ORDER BY storageLocation ASC, ingredientName ASC")
    fun observeActiveInventory(): Flow<List<InventoryItemEntity>>

    @Query("SELECT * FROM inventory_items WHERE isArchived = 0 AND itemType = :itemType ORDER BY storageLocation ASC, ingredientName ASC")
    fun observeInventoryByType(itemType: String): Flow<List<InventoryItemEntity>>

    @Query("SELECT * FROM inventory_items WHERE isArchived = 0 AND storageLocation = :location ORDER BY ingredientName ASC")
    fun observeInventoryByLocation(location: String): Flow<List<InventoryItemEntity>>

    @Query("SELECT * FROM inventory_items WHERE isArchived = 0 AND currentOnHandQuantity <= reorderPointQuantity ORDER BY currentOnHandQuantity ASC")
    fun observeLowStockItems(): Flow<List<InventoryItemEntity>>

    /**
     * Surplus query strictly bounded to active culinary food ingredients for the Par-to-Plate AI Engine.
     * Orders by descending dollar surplus ((onHand - reorderPoint) * unitCost).
     */
    @Query("""
        SELECT * FROM inventory_items 
        WHERE isArchived = 0 
          AND itemType = 'FOOD_INGREDIENT' 
          AND currentOnHandQuantity > reorderPointQuantity 
        ORDER BY ((currentOnHandQuantity - reorderPointQuantity) * unitCost) DESC
    """)
    fun observeSurplusFoodInventory(): Flow<List<InventoryItemEntity>>

    @Query("SELECT * FROM inventory_items WHERE isArchived = 1 ORDER BY archivedTimestamp DESC")
    fun observeArchivedInventory(): Flow<List<InventoryItemEntity>>

    // ========================================================================
    // 2. Direct Query Methods
    // ========================================================================

    @Query("SELECT * FROM inventory_items WHERE id = :id LIMIT 1")
    suspend fun getInventoryItemById(id: String): InventoryItemEntity?

    @Query("SELECT last_modified_utc FROM inventory_items WHERE id = :id LIMIT 1")
    suspend fun getLastModifiedTimestamp(id: String): Long?

    @Query("SELECT * FROM inventory_items WHERE isArchived = 0")
    suspend fun getAllActiveInventoryItems(): List<InventoryItemEntity>

    @Query("SELECT COUNT(*) FROM inventory_items WHERE isArchived = 0")
    suspend fun getActiveInventoryCount(): Int

    // ========================================================================
    // 3. Mutations (CRUD, Soft-Archive & LWW)
    // ========================================================================

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertOrUpdateInventoryItem(item: InventoryItemEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(items: List<InventoryItemEntity>)

    /**
     * Soft-archive preserves historical audit trails, FIFO cost tracking, and recipe references.
     */
    @Query("UPDATE inventory_items SET isArchived = 1, archivedTimestamp = :timestamp, last_modified_utc = :timestamp WHERE id = :id")
    suspend fun archiveInventoryItem(id: String, timestamp: Long = System.currentTimeMillis())

    @Query("UPDATE inventory_items SET isArchived = 0, archivedTimestamp = NULL, last_modified_utc = :timestamp WHERE id = :id")
    suspend fun restoreInventoryItem(id: String, timestamp: Long = System.currentTimeMillis())

    /**
     * Hard delete for permanent cleanup when explicitly requested.
     */
    @Query("DELETE FROM inventory_items WHERE id = :id")
    suspend fun deleteInventoryItem(id: String)

    @Transaction
    @Query("UPDATE inventory_items SET currentOnHandQuantity = :newQty, lastAuditTimestamp = :timestamp, auditedByProfile = :profile, last_modified_utc = :timestamp WHERE id = :id")
    suspend fun auditItemQuantity(id: String, newQty: Double, timestamp: Long, profile: String)

    /**
     * LWW-protected audit update: only applies if timestamp is greater than or equal to current record's timestamp.
     */
    @Query("""
        UPDATE inventory_items 
        SET currentOnHandQuantity = :newQty, 
            lastAuditTimestamp = :timestamp, 
            auditedByProfile = :profile, 
            last_modified_utc = :timestamp 
        WHERE id = :id AND last_modified_utc <= :timestamp
    """)
    suspend fun auditItemQuantityWithLww(id: String, newQty: Double, timestamp: Long, profile: String): Int

    @Transaction
    suspend fun batchAudit(audits: List<Triple<String, Double, String>>, timestamp: Long = System.currentTimeMillis()) {
        for ((id, qty, profile) in audits) {
            auditItemQuantity(id, qty, timestamp, profile)
        }
    }
}
