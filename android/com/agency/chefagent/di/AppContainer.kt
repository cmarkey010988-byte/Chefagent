package com.agency.chefagent.di

import android.content.Context
import android.util.Log
import com.agency.chefagent.data.local.ChefAgentDatabase
import com.agency.chefagent.data.local.SeedDataGenerator
import com.agency.chefagent.data.repository.InventoryRepository
import com.agency.chefagent.data.repository.PrepRepository
import com.agency.chefagent.domain.ChronosSchedulingUseCase
import com.agency.chefagent.domain.GenerateDailyPrepListUseCase
import com.agency.chefagent.sync.PeerSyncEngine
import com.agency.chefagent.ui.profile.ProfileStateManager
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

/**
 * AppContainer.kt
 *
 * Manual Dependency Injection container for ChefAgent multi-device kitchen kiosk terminals.
 * Enforces strict architectural boundaries without introducing heavy frameworks like Hilt.
 *
 * Concurrency & Startup Synchronization Invariant:
 * Fixes startup race conditions by maintaining a reactive [isDatabaseReady] StateFlow.
 * The UI is blocked (via Splash Screen or StateFlow collection) until the background
 * coroutine on [Dispatchers.IO] finishes seeding the Room SQLite database.
 */
class AppContainer(private val context: Context) {
    private val tag = "AppContainer"
    private val applicationScope = CoroutineScope(Dispatchers.IO + SupervisorJob())

    // Startup synchronization flag ensuring UI does not query unseeded Room tables
    private val _isDatabaseReady = MutableStateFlow(false)
    val isDatabaseReady: StateFlow<Boolean> = _isDatabaseReady.asStateFlow()

    // 1. Data Layer - Room SQLite WAL Master Database
    val database: ChefAgentDatabase by lazy {
        ChefAgentDatabase.getInstance(context)
    }

    val prepItemDao by lazy { database.prepItemDao() }
    val inventoryDao by lazy { database.inventoryDao() }
    val syncOutboxDao by lazy { database.syncOutboxDao() }
    val eventDao by lazy { database.eventDao() }
    val establishmentDao by lazy { database.establishmentDao() }

    // 2. Repositories
    val prepRepository: PrepRepository by lazy {
        PrepRepository(prepItemDao, syncOutboxDao)
    }

    val inventoryRepository: InventoryRepository by lazy {
        InventoryRepository(inventoryDao, syncOutboxDao)
    }

    // 3. Domain Use Cases
    val chronosSchedulingUseCase: ChronosSchedulingUseCase by lazy {
        ChronosSchedulingUseCase(prepItemDao)
    }

    val generateDailyPrepListUseCase: GenerateDailyPrepListUseCase by lazy {
        GenerateDailyPrepListUseCase(prepRepository)
    }

    // 4. State & Security Managers
    val profileStateManager: ProfileStateManager by lazy {
        ProfileStateManager(context)
    }

    // 5. Networking & Real-Time Sync
    val peerSyncEngine: PeerSyncEngine by lazy {
        PeerSyncEngine(
            context = context,
            prepItemDao = prepItemDao,
            inventoryDao = inventoryDao,
            syncOutboxDao = syncOutboxDao
        )
    }

    init {
        // Asynchronously check and seed Room database on Dispatchers.IO
        applicationScope.launch {
            try {
                Log.i(tag, "Initiating database pre-flight check and seed verification...")
                SeedDataGenerator.seedDatabaseIfEmpty(database)
                Log.i(tag, "Room SQLite database verified and seeded successfully.")
            } catch (e: Exception) {
                Log.e(tag, "Fatal error initializing seed data: ${e.message}", e)
            } finally {
                // Release the UI block gate
                _isDatabaseReady.value = true
                Log.i(tag, "Database readiness signaled to UI layer (isDatabaseReady = true).")

                // Start local peer discovery and Ktor server after database is ready
                try {
                    peerSyncEngine.startEngine()
                } catch (e: Exception) {
                    Log.e(tag, "Error starting PeerSyncEngine after DB init", e)
                }
            }
        }
    }

    /**
     * Suspending barrier for components requiring completed database readiness.
     */
    suspend fun awaitDatabaseReady() {
        if (!_isDatabaseReady.value) {
            _isDatabaseReady.first { it }
        }
    }
}
