package com.agency.chefagent.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey
import androidx.room.TypeConverters

/**
 * PrepItemEntity.kt
 *
 * Offline-first Room DB entity for BOH Line Prep, enhanced with Chronos reverse-calculated
 * timeline fields, duration estimates, predecessor dependencies, and Last-Writer-Wins (LWW)
 * conflict resolution timestamp tracking.
 */
@Entity(tableName = "prep_items")
@TypeConverters(DependenciesTypeConverter::class)
data class PrepItemEntity(
    @PrimaryKey
    val id: String,
    val recipeId: String,
    val recipeName: String,
    val targetQuantity: Double,
    val completedQuantity: Double,
    val unitOfMeasure: String,
    val stationAssignment: String, // "Sauce/Sauté", "Butchery", "Garde Manger", "Grill", "Pastry", "Dishwash/Sanitation"
    val priorityLevel: Int, // 1 = Critical Banquet/Special, 2 = Standard Par, 3 = Low
    val isCompleted: Boolean = false,
    val assignedCookName: String,
    val shiftedDateTimestamp: Long,

    // ========================================================================
    // Chronos Acoustic Orchestration Engine Fields
    // ========================================================================
    val targetFireTimestamp: Long? = null, // Epoch ms when prep must initiate on line
    val estimatedDurationMinutes: Int = 30, // Total lead time needed on station
    val dependencies: List<String> = emptyList(), // IDs of prerequisite prep items
    val chronosStage: String = "SUB_RECIPE", // "FABRICATION", "SUB_RECIPE", "HOT_HOLD", "PLATING_FIRE"
    val targetPlatingTimestamp: Long? = null, // Event or ticket hard plating deadline
    val banquetEventId: String? = null,

    // ========================================================================
    // Edge-AI Vision Telemetry & Pan Fill Level Fields
    // ========================================================================
    val visionStationId: String? = null,
    val detectedItemClass: String? = null,
    val fillLevelPercentage: Double = 100.0, // 0.0 - 100.0%
    val anomalyFlag: Boolean = false,
    val lastVisualTimestamp: Long? = null,

    // ========================================================================
    // Last-Writer-Wins (LWW) Conflict Resolution Timestamp
    // ========================================================================
    val last_modified_utc: Long = System.currentTimeMillis()
)

