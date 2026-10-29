package com.agency.chefagent.domain

import com.agency.chefagent.data.local.PrepItemEntity
import com.agency.chefagent.data.repository.PrepRepository
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn

/**
 * GenerateDailyPrepListUseCase.kt
 *
 * Reactive Domain UseCase orchestrating Back-of-House prep list generation.
 * Completely eliminates static hardcoded lists and connects directly to the Room SQLite WAL
 * via [PrepRepository].
 *
 * Invariants:
 * 1. Returns a reactive [Flow] of prep items, filtering dynamically by station if specified.
 * 2. Provides helper [asStateFlow] using [SharingStarted.WhileSubscribed(5000)] to maintain
 *    the reactive pipeline without leaks or redundant queries during screen transitions.
 */
class GenerateDailyPrepListUseCase(
    private val prepRepository: PrepRepository
) {

    /**
     * Executes the reactive prep query returning a Flow directly connected to the Room database.
     *
     * @param station Optional station filter ("Sauce/Sauté", "Butchery", "Garde Manger", "Pastry", or null/"ALL")
     * @return Hot reactive [Flow] emitting live prep list updates as Room DB records mutate.
     */
    fun execute(station: String? = null): Flow<List<PrepItemEntity>> {
        val normalizedStation = if (station.isNullOrBlank() || station.equals("ALL", ignoreCase = true)) {
            "ALL"
        } else {
            station
        }

        return if (normalizedStation == "ALL") {
            prepRepository.observeAllPrepItems()
        } else {
            prepRepository.observeChronosTimeline(normalizedStation)
        }
    }

    /**
     * Converts the reactive prep stream into a lifecycle-aware StateFlow bound to the provided scope.
     * Utilizes [SharingStarted.WhileSubscribed(5000)] to halt cursor polling 5 seconds after all
     * UI collectors disconnect (e.g. tablet screen sleep or navigation).
     */
    fun executeAsStateFlow(
        scope: CoroutineScope,
        station: String? = null,
        initialValue: List<PrepItemEntity> = emptyList()
    ): StateFlow<List<PrepItemEntity>> {
        return execute(station).stateIn(
            scope = scope,
            started = SharingStarted.WhileSubscribed(5000L),
            initialValue = initialValue
        )
    }

    /**
     * Filters active prep items scheduled for today's operational service window.
     */
    fun executeActiveToday(startOfDayTimestamp: Long): Flow<List<PrepItemEntity>> {
        return prepRepository.observeActivePrepItems(startOfDayTimestamp)
    }
}
