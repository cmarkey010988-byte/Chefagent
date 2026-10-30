package com.agency.chefagent.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Transaction
import kotlinx.coroutines.flow.Flow

/**
 * HaccpDao.kt
 *
 * Data Access Object for the Immutable HACCP & Safety Audit Compliance Ledger.
 * Enforces append-only semantics, WAL concurrency, and sequential block height ordering.
 */
@Dao
interface HaccpDao {

    @Query("SELECT * FROM haccp_safety_ledger ORDER BY blockHeight DESC")
    fun observeAllHaccpBlocks(): Flow<List<HaccpLogEntity>>

    @Query("SELECT * FROM haccp_safety_ledger WHERE stationId = :stationId ORDER BY blockHeight DESC")
    fun observeStationHaccpBlocks(stationId: String): Flow<List<HaccpLogEntity>>

    @Query("SELECT * FROM haccp_safety_ledger ORDER BY blockHeight DESC LIMIT 1")
    suspend fun getLatestBlock(): HaccpLogEntity?

    @Query("SELECT * FROM haccp_safety_ledger ORDER BY blockHeight ASC")
    suspend fun getAllBlocksForVerification(): List<HaccpLogEntity>

    @Query("SELECT COUNT(*) FROM haccp_safety_ledger")
    suspend fun getTotalBlockCount(): Long

    @Query("SELECT COUNT(*) FROM haccp_safety_ledger WHERE incidentType = 'TEMPERATURE_DANGER_ZONE'")
    suspend fun getDangerZoneCount(): Long

    @Insert(onConflict = OnConflictStrategy.ABORT)
    suspend fun appendBlock(block: HaccpLogEntity)

    @Transaction
    suspend fun batchAppendBlocks(blocks: List<HaccpLogEntity>) {
        blocks.forEach { appendBlock(it) }
    }
}
