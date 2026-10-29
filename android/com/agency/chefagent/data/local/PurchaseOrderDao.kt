package com.agency.chefagent.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Transaction
import androidx.room.Update
import kotlinx.coroutines.flow.Flow

/**
 * PurchaseOrderDao.kt
 *
 * Data Access Object for B2B supplier purchase orders with ANSI X12 EDI tracking.
 * Consolidated under com.agency.chefagent.data.local.
 */
@Dao
interface PurchaseOrderDao {

    @Query("SELECT * FROM purchase_orders ORDER BY orderDateTimestamp DESC")
    fun observeAllPurchaseOrders(): Flow<List<PurchaseOrderEntity>>

    @Query("SELECT * FROM purchase_orders WHERE status = :status ORDER BY orderDateTimestamp DESC")
    fun observePurchaseOrdersByStatus(status: String): Flow<List<PurchaseOrderEntity>>

    @Query("SELECT * FROM purchase_orders WHERE transmissionStatus = :transStatus ORDER BY orderDateTimestamp DESC")
    fun observePurchaseOrdersByTransmissionStatus(transStatus: String): Flow<List<PurchaseOrderEntity>>

    @Query("SELECT * FROM purchase_orders WHERE id = :id LIMIT 1")
    suspend fun getPurchaseOrderById(id: String): PurchaseOrderEntity?

    @Query("SELECT * FROM purchase_orders WHERE poNumber = :poNumber LIMIT 1")
    suspend fun getPurchaseOrderByPoNumber(poNumber: String): PurchaseOrderEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertPurchaseOrder(po: PurchaseOrderEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(orders: List<PurchaseOrderEntity>)

    @Update
    suspend fun updatePurchaseOrder(po: PurchaseOrderEntity)

    @Query("UPDATE purchase_orders SET status = :status WHERE id = :id")
    suspend fun updateStatus(id: String, status: String)

    @Query("UPDATE purchase_orders SET transmissionStatus = :transmissionStatus, distributorTrackingId = :trackingId WHERE id = :id")
    suspend fun updateEdiTransmission(id: String, transmissionStatus: String, trackingId: String?)

    @Query("DELETE FROM purchase_orders WHERE id = :id")
    suspend fun deletePurchaseOrder(id: String)

    @Transaction
    suspend fun batchInsertOrUpdate(orders: List<PurchaseOrderEntity>) {
        insertAll(orders)
    }
}
