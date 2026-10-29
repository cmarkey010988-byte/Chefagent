package com.agency.chefagent.data.local

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey
import java.util.UUID

/**
 * EventEntity.kt
 *
 * Represents a native kitchen, banquet, or catering event in ChefAgent's Room database.
 * Consolidated under com.agency.chefagent.data.local.
 * Supports guest headcounts, banquet menu plans serialized as JSON, and Google Calendar sync flags.
 */
@Entity(
    tableName = "kitchen_events",
    indices = [
        Index(value = ["category"]),
        Index(value = ["status"]),
        Index(value = ["startTime"]),
        Index(value = ["isSyncedToGoogle"])
    ]
)
data class EventEntity(
    @PrimaryKey
    val id: String = UUID.randomUUID().toString(),
    val title: String,
    val category: String, // "BANQUET", "BUFFET", "A_LA_CARTE_SPECIAL", "CATERING_DELIVERY", "KITCHEN_MAINTENANCE", "STAFF_MEETING"
    val status: String = "PLANNED", // "PLANNED", "IN_PREP", "COMPLETED", "CANCELLED"
    val startTime: Long, // Unix timestamp (ms)
    val endTime: Long,   // Unix timestamp (ms)
    val expectedGuestCount: Int = 0,
    val guaranteedHeadcount: Int? = null,
    val location: String = "Grand Ballroom",
    val clientName: String? = null,
    val eventNotes: String? = null,
    val menuPlanJson: String = "[]", // Serialized List<BanquetMenuItem>
    val isSyncedToGoogle: Boolean = false,
    val googleCalendarEventId: String? = null,
    val lastSyncedTimestamp: Long? = null,
    val createdTimestamp: Long = System.currentTimeMillis(),
    val updatedTimestamp: Long = System.currentTimeMillis()
)
