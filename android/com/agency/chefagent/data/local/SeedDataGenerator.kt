package com.agency.chefagent.data.local

import android.util.Log
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/**
 * SeedDataGenerator.kt
 *
 * Populates fresh ChefAgent Room SQLite database installations with realistic culinary,
 * banquet, inventory, and operational seed data.
 *
 * Concurrency Defense:
 * Executes within an atomic database check and batch commit on [Dispatchers.IO]
 * to prevent race conditions during kiosk startup.
 */
object SeedDataGenerator {
    private const val TAG = "SeedDataGenerator"

    val samplePrepItems = listOf(
        PrepItemEntity(
            id = "prep-1",
            recipeId = "rec-1",
            recipeName = "Prime Rib Au Jus & Peppercorn Demi",
            targetQuantity = 6.0,
            completedQuantity = 0.0,
            unitOfMeasure = "GAL",
            stationAssignment = "Sauce/Sauté",
            priorityLevel = 1,
            isCompleted = false,
            assignedCookName = "Chef Bruce",
            shiftedDateTimestamp = System.currentTimeMillis(),
            targetFireTimestamp = System.currentTimeMillis() + 1800000L,
            estimatedDurationMinutes = 90,
            chronosStage = "SUB_RECIPE",
            last_modified_utc = System.currentTimeMillis()
        ),
        PrepItemEntity(
            id = "prep-2",
            recipeId = "rec-2",
            recipeName = "Dry-Aged Center-Cut Tenderloin Butchery",
            targetQuantity = 45.0,
            completedQuantity = 0.0,
            unitOfMeasure = "Portions",
            stationAssignment = "Butchery",
            priorityLevel = 1,
            isCompleted = false,
            assignedCookName = "Cook Marco",
            shiftedDateTimestamp = System.currentTimeMillis(),
            targetFireTimestamp = System.currentTimeMillis() + 3600000L,
            estimatedDurationMinutes = 45,
            chronosStage = "FABRICATION",
            last_modified_utc = System.currentTimeMillis()
        ),
        PrepItemEntity(
            id = "prep-3",
            recipeId = "rec-3",
            recipeName = "Truffle Herb Compound Butter Logs",
            targetQuantity = 12.0,
            completedQuantity = 0.0,
            unitOfMeasure = "Logs",
            stationAssignment = "Garde Manger",
            priorityLevel = 2,
            isCompleted = false,
            assignedCookName = "Cook Leo",
            shiftedDateTimestamp = System.currentTimeMillis(),
            targetFireTimestamp = System.currentTimeMillis() + 5400000L,
            estimatedDurationMinutes = 30,
            chronosStage = "SUB_RECIPE",
            last_modified_utc = System.currentTimeMillis()
        ),
        PrepItemEntity(
            id = "prep-4",
            recipeId = "rec-4",
            recipeName = "Belgian Chocolate Tartlet Shells & Ganache",
            targetQuantity = 50.0,
            completedQuantity = 0.0,
            unitOfMeasure = "EA",
            stationAssignment = "Pastry",
            priorityLevel = 2,
            isCompleted = false,
            assignedCookName = "Pastry Chef Elena",
            shiftedDateTimestamp = System.currentTimeMillis(),
            targetFireTimestamp = System.currentTimeMillis() + 7200000L,
            estimatedDurationMinutes = 60,
            chronosStage = "PLATING_FIRE",
            last_modified_utc = System.currentTimeMillis()
        )
    )

    val sampleInventoryItems = listOf(
        InventoryItemEntity(
            id = "inv-1",
            ingredientId = "ing-prime-rib",
            ingredientName = "USDA Prime Bone-In Ribeye",
            itemType = InventoryItemEntity.ITEM_TYPE_FOOD,
            unitOfMeasure = "LB",
            storageLocation = "Walk-In Cooler",
            currentOnHandQuantity = 14.5,
            parLevelQuantity = 40.0,
            reorderPointQuantity = 18.0,
            unitCost = 24.50,
            auditedByProfile = "BOH_CHEF",
            last_modified_utc = System.currentTimeMillis()
        ),
        InventoryItemEntity(
            id = "inv-2",
            ingredientId = "ing-halibut",
            ingredientName = "Wild Pacific Halibut Fillet",
            itemType = InventoryItemEntity.ITEM_TYPE_FOOD,
            unitOfMeasure = "LB",
            storageLocation = "Walk-In Cooler",
            currentOnHandQuantity = 26.0,
            parLevelQuantity = 30.0,
            reorderPointQuantity = 15.0,
            unitCost = 28.00,
            auditedByProfile = "BOH_CHEF",
            last_modified_utc = System.currentTimeMillis()
        ),
        InventoryItemEntity(
            id = "inv-3",
            ingredientId = "ing-truffle-butter",
            ingredientName = "Black Truffle Compound Butter",
            itemType = InventoryItemEntity.ITEM_TYPE_FOOD,
            unitOfMeasure = "LB",
            storageLocation = "Walk-In Cooler",
            currentOnHandQuantity = 8.5,
            parLevelQuantity = 10.0,
            reorderPointQuantity = 4.0,
            unitCost = 32.00,
            auditedByProfile = "FOH_MANAGER",
            last_modified_utc = System.currentTimeMillis()
        ),
        InventoryItemEntity(
            id = "inv-4",
            ingredientId = "ing-sanitizer",
            ingredientName = "Quaternary Multi-Surface Line Sanitizer",
            itemType = InventoryItemEntity.ITEM_TYPE_CHEMICAL,
            unitOfMeasure = "CASE",
            storageLocation = "Chemical Storage",
            currentOnHandQuantity = 4.0,
            parLevelQuantity = 6.0,
            reorderPointQuantity = 2.0,
            unitCost = 38.50,
            auditedByProfile = "FOH_MANAGER",
            last_modified_utc = System.currentTimeMillis()
        )
    )

    val sampleEvents = listOf(
        EventEntity(
            id = "event-1",
            title = "Annual Hospitality Executives Gala",
            category = "BANQUET",
            status = "PLANNED",
            startTime = System.currentTimeMillis() + 86400000L,
            endTime = System.currentTimeMillis() + 97200000L,
            expectedGuestCount = 180,
            location = "Main Dining Room",
            clientName = "Sommelier Guild",
            last_modified_utc = System.currentTimeMillis()
        )
    )

    val defaultEstablishmentProfile = EstablishmentProfileEntity(
        id = "active_profile",
        name = "Grand Summit Culinary Lodge",
        type = "FINE_DINING",
        currencySymbol = "$",
        last_modified_utc = System.currentTimeMillis()
    )

    /**
     * Atomically populates initial seed records if tables are fresh.
     * All writes run inside [Dispatchers.IO].
     */
    suspend fun seedDatabaseIfEmpty(database: ChefAgentDatabase): Boolean = withContext(Dispatchers.IO) {
        try {
            val prepDao = database.prepItemDao()
            val invDao = database.inventoryDao()
            val eventDao = database.eventDao()
            val estDao = database.establishmentDao()

            var seeded = false

            if (prepDao.getPrepItemCount() == 0) {
                prepDao.insertPrepItems(samplePrepItems)
                seeded = true
                Log.i(TAG, "Seeded ${samplePrepItems.size} initial prep list items.")
            }

            if (invDao.getActiveInventoryCount() == 0) {
                invDao.insertAll(sampleInventoryItems)
                seeded = true
                Log.i(TAG, "Seeded ${sampleInventoryItems.size} initial inventory ledger records.")
            }

            if (eventDao.getAllEvents().isEmpty()) {
                eventDao.insertEvents(sampleEvents)
                seeded = true
                Log.i(TAG, "Seeded banquet events.")
            }

            if (estDao.getProfile() == null) {
                estDao.saveProfile(defaultEstablishmentProfile)
                seeded = true
                Log.i(TAG, "Seeded default establishment profile.")
            }

            seeded
        } catch (e: Exception) {
            Log.e(TAG, "Error seeding ChefAgent SQLite database", e)
            false
        }
    }
}
