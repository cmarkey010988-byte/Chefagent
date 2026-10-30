package com.agency.chefagent.data.local

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey

/**
 * HaccpLogEntity.kt
 *
 * Immutable, Cryptographically Chained Room SQLite Entity for HACCP & Kitchen Safety Compliance.
 * Each entry is linked to the previous block via SHA-256 hash chaining, guaranteeing 100%
 * tamper-evident auditability for Executive Chefs, Country Club Food Safety Officers, and Health Inspectors.
 */
@Entity(
    tableName = "haccp_safety_ledger",
    indices = [
        Index(value = ["stationId", "timestamp"]),
        Index(value = ["incidentType"]),
        Index(value = ["currentHash"], unique = true)
    ]
)
data class HaccpLogEntity(
    @PrimaryKey
    val blockHeight: Long,
    val timestamp: Long,
    val stationId: String,
    val incidentType: String, // "TEMPERATURE_DANGER_ZONE", "KNIFE_HAZARD", "HANDS_SAFETY_ZONE", "AUTO_86_TRIGGER", "LENS_GREASE_OBSCURATION", "SANITATION_TIME_LIMIT"
    val itemDescription: String,
    val measuredValue: String,
    val thresholdValue: String,
    val actionTaken: String,
    val previousHash: String,
    val currentHash: String,
    val signatureVerified: Boolean = true,
    val inspectorSignedBy: String = "AUTOMATED_VISION_AUDIT"
)
