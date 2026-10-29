package com.agency.chefagent.presentation

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.agency.chefagent.data.local.PrepItemDao
import com.agency.chefagent.data.local.PrepItemEntity
import com.agency.chefagent.domain.ChronosSchedulingUseCase
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.flatMapLatest
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

/**
 * PrepListViewModel.kt
 *
 * Production-grade Android ViewModel managing Back-of-House Chronos prep schedules.
 * Optimizes Room SQLite WAL reads by strictly utilizing:
 * .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), initialValue)
 *
 * This prevents memory leaks and halts idle database observation when kitchen tablet
 * screens dim or transition to ambient standby mode.
 */
class PrepListViewModel(
    private val prepItemDao: PrepItemDao,
    private val chronosSchedulingUseCase: ChronosSchedulingUseCase
) : ViewModel() {

    private val _selectedStation = MutableStateFlow("ALL")
    val selectedStation: StateFlow<String> = _selectedStation

    /**
     * Optimized StateFlow collecting from Room SQLite WAL database.
     * WhileSubscribed(5000) keeps upstream Flow alive for 5 seconds after the last UI subscriber disconnects,
     * handling rapid configuration changes (orientation flip, split-screen) without redundant re-subscriptions,
     * and automatically cancels idle SQLite cursor polling when the tablet screen turns off.
     */
    val prepTimeline: StateFlow<List<PrepItemEntity>> = _selectedStation
        .flatMapLatest { station ->
            prepItemDao.observeChronosTimeline(station)
        }
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = emptyList()
        )

    fun selectStation(station: String) {
        _selectedStation.value = station
    }

    fun completePrepItem(itemId: String, completedQty: Double) {
        viewModelScope.launch {
            prepItemDao.updateCompletionStatus(itemId, true, completedQty)
        }
    }

    fun recalculateChronosSchedule(targetPlatingTime: Long, items: List<PrepItemEntity>, banquetId: String? = null) {
        viewModelScope.launch {
            chronosSchedulingUseCase.execute(targetPlatingTime, items, banquetId)
        }
    }
}
