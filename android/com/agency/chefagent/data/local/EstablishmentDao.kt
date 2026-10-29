package com.agency.chefagent.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Update
import kotlinx.coroutines.flow.Flow

/**
 * EstablishmentDao.kt
 *
 * Provides Room SQLite operations for reading and updating the venue's profile and storage locations.
 * Consolidated under com.agency.chefagent.data.local.
 */
@Dao
interface EstablishmentDao {

    @Query("SELECT * FROM establishment_profile WHERE id = :profileId LIMIT 1")
    fun getProfileFlow(profileId: String = "active_profile"): Flow<EstablishmentProfileEntity?>

    @Query("SELECT * FROM establishment_profile WHERE id = :profileId LIMIT 1")
    suspend fun getProfileDirect(profileId: String = "active_profile"): EstablishmentProfileEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertOrUpdateProfile(profile: EstablishmentProfileEntity)

    @Update
    suspend fun updateProfile(profile: EstablishmentProfileEntity)

    @Query("DELETE FROM establishment_profile WHERE id = :profileId")
    suspend fun deleteProfile(profileId: String = "active_profile")
}
