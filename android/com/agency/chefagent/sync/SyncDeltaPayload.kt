package com.agency.chefagent.sync

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

/**
 * SyncDeltaPayload.kt
 *
 * Immutable delta wire transfer object representing an atomic entity mutation
 * broadcasted across the local kitchen kiosk network over Ktor WebSockets.
 *
 * Implements strict Last-Writer-Wins (LWW) conflict resolution via [last_modified_utc].
 */
@JsonClass(generateAdapter = true)
data class SyncDeltaPayload(
    @Json(name = "eventId") val eventId: String,
    @Json(name = "entityType") val entityType: String, // "PREP", "INVENTORY", "EVENT", "ORDER", "PROFILE"
    @Json(name = "operationType") val operationType: String, // "UPSERT", "UPDATE_PROGRESS", "DELETE", "ARCHIVE"
    @Json(name = "entityId") val entityId: String,
    @Json(name = "payloadJson") val payloadJson: String,
    @Json(name = "last_modified_utc") val last_modified_utc: Long,
    @Json(name = "originKioskId") val originKioskId: String
)

@JsonClass(generateAdapter = true)
data class PeerHandshakeMessage(
    @Json(name = "nodeId") val nodeId: String,
    @Json(name = "kioskName") val kioskName: String,
    @Json(name = "protocolVersion") val protocolVersion: String = "2.0-KTOR-WS",
    @Json(name = "timestamp") val timestamp: Long = System.currentTimeMillis()
)
