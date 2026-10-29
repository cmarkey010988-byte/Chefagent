package com.agency.chefagent.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey

/**
 * EstablishmentProfileEntity.kt
 *
 * Represents the establishment's operational profile, archetype, and serialized custom
 * storage location configuration in Room SQLite storage.
 * Consolidated under com.agency.chefagent.data.local.
 */
@Entity(tableName = "establishment_profile")
data class EstablishmentProfileEntity(
    @PrimaryKey
    val id: String = "active_profile",
    val name: String,
    val type: String, // "FINE_DINING", "STEAKHOUSE", "CASUAL_GASTROPUB", "BISTRO", "CAFE_BAKERY", "BANQUET_COUNTRY_CLUB"
    val currencySymbol: String = "$",
    val primaryLocationsJson: String = "[]", // Serialized List<StorageLocationConfig>
    val lastUpdatedTimestamp: Long = System.currentTimeMillis()
)
