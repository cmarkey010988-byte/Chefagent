package com.agency.chefagent.data.local

import androidx.room.Entity
import androidx.room.Index
import androidx.room.PrimaryKey
import java.util.UUID

/**
 * PurchaseOrderEntity.kt
 *
 * Room Database Entity for B2B Supplier Purchase Orders with ANSI X12 EDI tracking,
 * distributor tracking numbers, audit logging metadata, and optimistic locking (@Version).
 */
@Entity(
    tableName = "purchase_orders",
    indices = [
        Index(value = ["poNumber"], unique = true),
        Index(value = ["ediControlNumber"]),
        Index(value = ["transmissionStatus"]),
        Index(value = ["status"])
    ]
)
data class PurchaseOrderEntity(
    @PrimaryKey
    val id: String = UUID.randomUUID().toString(),
    val poNumber: String,
    val vendorName: String,
    val vendorContact: String? = null,
    val orderDateTimestamp: Long = System.currentTimeMillis(),
    val expectedDeliveryDateTimestamp: Long,
    val receivedDateTimestamp: Long? = null,
    val status: String = "DRAFT", // DRAFT, SUBMITTED, RECEIVED, PARTIAL, CANCELLED
    val totalCost: Double = 0.0,
    val invoiceNumber: String? = null,
    val notes: String? = null,

    // ========================================================================
    // B2B DISTRIBUTOR EDI PIPELINE EXPANSION (ANSI X12 850 / 855 / 856)
    // ========================================================================
    val ediControlNumber: String? = null,
    val transmissionStatus: String = "DRAFT", // DRAFT, QUEUED, TRANSMITTED, ACKNOWLEDGED, SHIPPED, FAILED
    val distributorTrackingId: String? = null,
    val lastEdiErrorLog: String? = null,
    val overallFillRatePercent: Double? = null,
    val rawEdiEnvelopeExcerpt: String? = null,

    // Optimistic Concurrency Control (@Version)
    val version: Long = 1L
)

enum class TransmissionStatus {
    DRAFT,
    QUEUED,
    TRANSMITTED,
    ACKNOWLEDGED,
    SHIPPED,
    FAILED
}
