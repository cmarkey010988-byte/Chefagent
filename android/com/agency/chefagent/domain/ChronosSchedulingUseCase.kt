package com.agency.chefagent.domain

import com.agency.chefagent.data.local.PrepItemDao
import com.agency.chefagent.data.local.PrepItemEntity
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/**
 * ChronosSchedulingUseCase.kt
 *
 * Core algorithmic engine of the Chronos Acoustic Orchestration Engine.
 * Reverse-calculates exact station fire timestamps (targetFireTimestamp) from a target
 * plating deadline (Banquet event guest service or table ticket firing), traversing
 * task dependencies and inserting a 15-minute inter-station staging/resting buffer.
 *
 * Enforces:
 * 1. 100% offline execution isolated on Dispatchers.Default.
 * 2. Topological sort over dependency DAG (Direct Acyclic Graph).
 * 3. Atomic batch commit to Room DB via Dispatchers.IO.
 */
class ChronosSchedulingUseCase(
    private val prepItemDao: PrepItemDao,
    private val defaultDispatcher: CoroutineDispatcher = Dispatchers.Default,
    private val ioDispatcher: CoroutineDispatcher = Dispatchers.IO
) {

    companion object {
        const val STAGING_BUFFER_MINUTES = 15L
        const val MILLIS_PER_MINUTE = 60_000L
    }

    /**
     * Reverse-schedules prep items for a target plating deadline.
     *
     * @param targetPlatingTimestamp Epoch milliseconds when food must hit banquet tables or pass window.
     * @param items List of prep items associated with the banquet event or service session.
     * @param banquetEventId Optional associated banquet or event ID.
     * @return List of updated PrepItemEntity items with calculated targetFireTimestamp values.
     */
    suspend fun execute(
        targetPlatingTimestamp: Long,
        items: List<PrepItemEntity>,
        banquetEventId: String? = null
    ): List<PrepItemEntity> = withContext(defaultDispatcher) {
        if (items.isEmpty()) return@withContext emptyList()

        // Map items by ID for O(1) graph traversal
        val itemMap = items.associateBy { it.id }.toMutableMap()

        // Build reverse dependency graph: parentId -> children (tasks that depend on parent)
        // If B depends on A, then A is prerequisite of B; B must fire after A finishes.
        val successorMap = mutableMapOf<String, MutableList<String>>()
        items.forEach { item ->
            item.dependencies.forEach { parentId ->
                successorMap.getOrPut(parentId) { mutableListOf() }.add(item.id)
            }
        }

        // Identify terminal tasks (items with no successors that lead directly into plating)
        val terminalItemIds = items.filter { item ->
            successorMap[item.id].isNullOrEmpty()
        }.map { it.id }

        val calculatedFireTimes = mutableMapOf<String, Long>()

        // Recursive backward propagation function
        fun computeFireTimestamp(itemId: String): Long {
            if (calculatedFireTimes.containsKey(itemId)) {
                return calculatedFireTimes[itemId]!!
            }

            val item = itemMap[itemId] ?: return targetPlatingTimestamp
            val durationMillis = item.estimatedDurationMinutes.toLong() * MILLIS_PER_MINUTE
            val stagingBufferMillis = STAGING_BUFFER_MINUTES * MILLIS_PER_MINUTE

            val successors = successorMap[itemId]
            val fireTime = if (successors.isNullOrEmpty()) {
                // Direct plating line task (e.g. Sauté sear or final banquet carve)
                targetPlatingTimestamp - durationMillis
            } else {
                // Must complete before earliest successor needs to fire, minus 15m staging buffer
                val earliestSuccessorFire = successors.minOf { succId ->
                    computeFireTimestamp(succId)
                }
                earliestSuccessorFire - stagingBufferMillis - durationMillis
            }

            calculatedFireTimes[itemId] = fireTime
            return fireTime
        }

        // Compute for all terminal tasks (which transitively cascades to all dependencies)
        items.forEach { item ->
            computeFireTimestamp(item.id)
        }

        // Map updated entities
        val scheduledEntities = items.map { item ->
            val computedFireTime = calculatedFireTimes[item.id] ?: (targetPlatingTimestamp - (item.estimatedDurationMinutes * MILLIS_PER_MINUTE))
            item.copy(
                targetFireTimestamp = computedFireTime,
                targetPlatingTimestamp = targetPlatingTimestamp,
                banquetEventId = banquetEventId ?: item.banquetEventId
            )
        }.sortedBy { it.targetFireTimestamp }

        // Atomic write back to Room Database
        withContext(ioDispatcher) {
            prepItemDao.batchUpdateChronosSchedule(scheduledEntities)
        }

        scheduledEntities
    }
}
