package com.agency.chefagent.data.repository

import com.agency.chefagent.data.local.InventoryDao
import com.agency.chefagent.data.local.InventoryItemEntity
import com.agency.chefagent.data.local.SyncOutboxDao
import com.agency.chefagent.data.local.SyncOutboxEntity
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.withContext
import java.util.UUID

/**
 * InventoryRepository.kt
 *
 * Coordinates inventory persistence across Room SQLite database and WAL outbox sync.
 * Consolidated under com.agency.chefagent.data.repository.
 * All mutations execute on Dispatchers.IO.
 */
class InventoryRepository(
    private val inventoryDao: InventoryDao,
    private val syncOutboxDao: SyncOutboxDao,
    private val ioDispatcher: CoroutineDispatcher = Dispatchers.IO
) {

    // ========================================================================
    // Reactive Streams
    // ========================================================================

    fun observeActiveInventory(): Flow<List<InventoryItemEntity>> =
        inventoryDao.observeActiveInventory()

    fun observeInventoryByType(itemType: String): Flow<List<InventoryItemEntity>> =
        inventoryDao.observeInventoryByType(itemType)

    fun observeInventoryByLocation(location: String): Flow<List<InventoryItemEntity>> =
        if (location == "ALL") inventoryDao.observeActiveInventory()
        else inventoryDao.observeInventoryByLocation(location)

    fun observeLowStockItems(): Flow<List<InventoryItemEntity>> =
        inventoryDao.observeLowStockItems()

    fun observeSurplusFoodInventory(): Flow<List<InventoryItemEntity>> =
        inventoryDao.observeSurplusFoodInventory()

    fun observeArchivedInventory(): Flow<List<InventoryItemEntity>> =
        inventoryDao.observeArchivedInventory()

    // ========================================================================
    // Mutations (Dispatchers.IO)
    // ========================================================================

    suspend fun insertOrUpdateItem(item: InventoryItemEntity, auditorProfile: String = "FOH_MANAGER") =
        withContext(ioDispatcher) {
            val timestamp = System.currentTimeMillis()
            val stampedItem = item.copy(
                lastAuditTimestamp = timestamp,
                auditedByProfile = auditorProfile
            )
            inventoryDao.insertOrUpdateInventoryItem(stampedItem)

            // WAL Outbox Queue enqueue
            syncOutboxDao.enqueuePayload(
                SyncOutboxEntity(
                    id = UUID.randomUUID().toString(),
                    entityType = "INVENTORY",
                    operationType = "UPSERT",
                    payloadJson = """{"id":"${stampedItem.id}","name":"${stampedItem.ingredientName}","type":"${stampedItem.itemType}","location":"${stampedItem.storageLocation}","onHand":${stampedItem.currentOnHandQuantity},"par":${stampedItem.parLevelQuantity},"reorder":${stampedItem.reorderPointQuantity},"cost":${stampedItem.unitCost},"timestamp":$timestamp}""",
                    createdAt = timestamp
                )
            )
        }

    suspend fun auditItemQuantity(id: String, newQty: Double, auditorProfile: String) =
        withContext(ioDispatcher) {
            val timestamp = System.currentTimeMillis()
            inventoryDao.auditItemQuantity(id, newQty, timestamp, auditorProfile)

            syncOutboxDao.enqueuePayload(
                SyncOutboxEntity(
                    id = UUID.randomUUID().toString(),
                    entityType = "INVENTORY",
                    operationType = "UPDATE_QUANTITY",
                    payloadJson = """{"itemId":"$id","auditedQty":$newQty,"auditedBy":"$auditorProfile","timestamp":$timestamp}""",
                    createdAt = timestamp
                )
            )
        }

    suspend fun archiveItem(id: String, auditorProfile: String = "FOH_MANAGER") =
        withContext(ioDispatcher) {
            val timestamp = System.currentTimeMillis()
            inventoryDao.archiveInventoryItem(id, timestamp)

            syncOutboxDao.enqueuePayload(
                SyncOutboxEntity(
                    id = UUID.randomUUID().toString(),
                    entityType = "INVENTORY",
                    operationType = "ARCHIVE",
                    payloadJson = """{"itemId":"$id","isArchived":true,"timestamp":$timestamp,"archivedBy":"$auditorProfile"}""",
                    createdAt = timestamp
                )
            )
        }

    suspend fun restoreItem(id: String) =
        withContext(ioDispatcher) {
            inventoryDao.restoreInventoryItem(id)
        }

    suspend fun deleteItem(id: String) =
        withContext(ioDispatcher) {
            inventoryDao.deleteInventoryItem(id)
        }
}
