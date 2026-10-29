package com.agency.chefagent.data.local

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey
import java.util.UUID

/**
 * InventoryItemEntity.kt
 *
 * Unified Room DB entity representing an on-hand stock item in ChefAgent's perpetual inventory ledger.
 * Fully consolidated under com.agency.chefagent.data.local.
 * Supports both culinary food ingredients and non-food operational supplies.
 * Enforces Last-Writer-Wins (LWW) conflict resolution via [last_modified_utc].
 */
@Entity(
    tableName = "inventory_items",
    indices = [
        Index(value = ["itemType"]),
        Index(value = ["storageLocation"]),
        Index(value = ["isArchived"]),
        Index(value = ["last_modified_utc"])
    ]
)
data class InventoryItemEntity(
    @PrimaryKey
    val id: String = UUID.randomUUID().toString(),
    val ingredientId: String,
    val ingredientName: String = "",
    val itemType: String = ITEM_TYPE_FOOD, // "FOOD_INGREDIENT", "CHEMICAL_SUPPLY", "JANITORIAL", "OPERATIONAL_CONSUMABLE"
    val unitOfMeasure: String = "CASE",
    val storageLocation: String, // Culinary: "Walk-In Cooler", "Dry Prep", "Freezer", "Bar" | Operational: "Chemical Storage", "Janitorial / Facilities", "Paper Goods", "Bar Consumables"
    val currentOnHandQuantity: Double = 0.0,
    val parLevelQuantity: Double = 10.0,
    val reorderPointQuantity: Double = 3.0,
    val unitCost: Double = 0.0,
    val lastAuditTimestamp: Long = System.currentTimeMillis(),
    val auditedByProfile: String = "FOH_MANAGER",
    val isArchived: Boolean = false,
    val archivedTimestamp: Long? = null,
    val last_modified_utc: Long = System.currentTimeMillis()
) {
    companion object {
        const val ITEM_TYPE_FOOD = "FOOD_INGREDIENT"
        const val ITEM_TYPE_CHEMICAL = "CHEMICAL_SUPPLY"
        const val ITEM_TYPE_JANITORIAL = "JANITORIAL"
        const val ITEM_TYPE_CONSUMABLE = "OPERATIONAL_CONSUMABLE"
    }
}
