# ChefAgent: Multi-Mode Offline-First Android Architecture

ChefAgent is a production-grade, offline-first B2B Android platform engineered for private country clubs, fine dining establishments, and high-volume hospitality management. The system unifies Back-of-House (BOH) kitchen execution for executive chefs and station cooks with Front-of-House (FOH) operational and costing management for general managers, within a single application binary that dynamically adapts its layout density, touch target dimensions, and feature sets via role-based profiles.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> **Revised Architectural Mandates Incorporated**:
> 1. **Flow Conflation & Subscription Lifecycle**: Active prep lists, recipe streams, and inventory audit flows are observed through Room DAOs using `.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), initialValue)` with conflation to eliminate redundant queries during configuration changes and line station toggling.
> 2. **WAL Concurrency & Atomic Integrity**: SQLite WAL mode enables simultaneous reader/writer concurrency. Multi-table writes (such as recipe creation, batch scaling overrides, and banquet breakdown generation) are explicitly annotated with `@Transaction` across `recipes` and `recipe_ingredients` to guarantee ACID transactional consistency.
> 3. **Android 13+ Kiosk Immersive Mode (`WindowInsetsControllerCompat`)**: Uses modern Jetpack Window APIs (`WindowCompat.setDecorFitsSystemWindows(window, false)` and `WindowInsetsControllerCompat` with `BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE`) combined with system bar hide routines to maintain lockdown even under aggressive swipe gestures on Samsung Galaxy Tab A8/A9 mounts.
> 4. **Role Separation**:
>    - **BOH Kitchen Line (Chef Bruce)**: OLED high-contrast dark theme (`#121212`), high-visibility amber/emerald action buttons, massive touch targets (minimum 64dp up to 88dp cards) for rapid line operation with aprons and gloves, single-tap batch completions, and real-time recipe yield scaling.
>    - **FOH Management (Manager Ashley)**: Clean, executive light slate theme (`#F8F9FA`), dense data tables (48dp touch targets), live food cost percentage (FCP) gauges with margin squeeze threshold warnings, inventory audit reconciliation with par alerts, and banquet costing breakdowns.
> 5. **PIN-Protected Security**: Switching to FOH Management requires a 4-digit PIN (default master PIN `1234`, validated via SHA-256 hash).

---

## 1. Overview & Core Concept

### What It Does
ChefAgent provides an all-in-one kitchen production and food service management terminal. Chefs can view daily prep lists by station (Sauce/Sauté, Butchery, Garde Manger, Pastry), scale recipes dynamically from base batches to 500+ banquet covers with automatic yield loss math, and mark items done with single-tap progress. Managers can audit walk-in and dry storage inventory, identify low-stock items against par levels, inspect recipe food cost percentages against a 28% club benchmark, and sync changes across local devices without requiring active internet connectivity.

### Target Personas
1. **Executive Chef Bruce & Line Cooks (BOH)**: Fast-paced, wet-hand, line environment. Needs clear typography at arm's length, 64dp+ tap targets, high contrast, and instant feedback.
2. **General Manager Ashley & F&B Directors (FOH)**: Office or dining room audit mode. Needs data density, margin health monitoring, cost variance alerts, and inventory valuation sheets.

---

## 2. User Experience & Visual Design

### Dual-Profile Design System & Themes

```
┌──────────────────────────────────────────────┬──────────────────────────────────────────────┐
│        BOH Kitchen Execution Profile         │       FOH Management & Costing Profile       │
├──────────────────────────────────────────────┼──────────────────────────────────────────────┤
│ Atmosphere: Deep Matte Dark (#121212)        │ Atmosphere: Executive Slate Light (#F8F9FA)  │
│ Primary Accent: Kitchen Amber (#FF9800)      │ Primary Accent: Deep Navy & Indigo (#1E293B) │
│ Success State: Emerald Green (#1B5E20)       │ Alert Accent: Coral Crimson (#DC2626)        │
│ Card Elevation: Flat High-Contrast Borders   │ Card Elevation: Crisp Layered Cards (2dp-4dp)│
│ Touch Target Min: 64dp (up to 88dp cards)    │ Touch Target Min: 48dp (Data-Dense Grids)    │
│ Typographic Focus: 24sp-28sp Bold Numerals   │ Typographic Focus: 12sp-16sp Tabular Metrics │
└──────────────────────────────────────────────┴──────────────────────────────────────────────┘
```

### Key User Flows

1. **Station Prep Execution (BOH)**:
   - Chef filters by station chips (`ALL`, `Sauce/Sauté`, `Butchery`, `Garde Manger`, `Pastry`).
   - Cards display target quantities, priority tags, and completion status.
   - Tapping anywhere on the 88dp card marks the item complete with instant green haptic visual feedback and writes to the local sync event log.
2. **Recipe Yield & Batch Scaling (BOH)**:
   - Select recipe (e.g., Prime Rib Au Jus, Truffle Risotto Base, Lemon Tartlet Shells).
   - Enter target yield (e.g., 150 portions).
   - Instant computation on `Dispatchers.Default` displays scaled ingredient requirements with waste factors and estimated raw cost breakdown.
3. **PIN-Guarded Mode Switch**:
   - Tapping the mode toggle in the top bar prompts for the 4-digit manager PIN.
   - Keypad dialog validates SHA-256 hash before switching UI density and navigation hierarchy.
4. **Inventory Audit & Par Reconciliation (FOH)**:
   - Filter by storage location (Walk-In Cooler, Dry Prep, Freezer, Bar).
   - Instant count adjustments with inline low-stock indicator flags when current on-hand drops below reorder point.
5. **Menu Margin & Food Cost Percentage Dashboard (FOH)**:
   - Real-time calculation of dish portion costs vs target menu prices.
   - Visual alerts highlighting dishes where actual FCP exceeds the target 28% club threshold (Margin Squeezed).
6. **Peer-to-Peer Sync Status & Event Log**:
   - Live status badge indicating P2P discovery state (Broadcasting / Listening / Synced).
   - Manual sync trigger to flush pending events in the queue.

---

## 3. Key Product Decisions & Concurrency Architecture

| Decision | Chosen Approach | Rationale | Alternatives Considered |
|---|---|---|---|
| **Local Persistence** | Room Database v2.7+ with SQLite WAL Mode & `@Transaction` | Offline-first mandate. Simultaneous reader concurrency with guaranteed ACID multi-table writes. | Cloud-only Firestore (rejected due to kitchen connectivity dead zones). |
| **Flow Conflation** | `.stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), ...)` | Prevents wasteful database queries and recompositions during orientation changes and station filtering. | Direct `.collectAsState()` without upstream caching (causes re-querying on every UI rebuild). |
| **Kiosk Security** | `WindowInsetsControllerCompat` with `BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE` | Hardens Android 13+ devices against aggressive swipe edge cases while keeping screens active. | Deprecated `systemUiVisibility` flags (flaky on API 33+). |
| **Thread Isolation** | Strict `Dispatchers.IO` and `Dispatchers.Default` dispatch | Guarantees touch responses within <16ms (60fps/120fps) and prevents UI thread starvation. | Executing use-case math on `Dispatchers.Main` (violates performance mandate). |
| **Dependency Scoping** | Clean `AppContainer` with manual constructor injection | 100% build reliability with AGP 9.1 and Kotlin 2.2 without KSP/kapt annotation processing conflicts. | Heavy Hilt configuration with KAPT (prone to K2 compiler breakages). |

---

## 4. Technical Architecture & Data Strategy

### System Component Diagram

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Jetpack Compose UI Tree                         │
│  ┌─────────────────────────────────┐ ┌───────────────────────────────┐ │
│  │   BOH Kitchen (64dp Targets)    │ │    FOH Management (48dp)      │ │
│  │  - Prep List Station View       │ │  - Inventory Audit & Valuation│ │
│  │  - Recipe Scaling Calculator    │ │  - Menu Margin & FCP Dashboard│ │
│  │  - Banquet Cover Breakdown      │ │  - Invoice & Vendor Review    │ │
│  └────────────────┬────────────────┘ └───────────────┬───────────────┘ │
│                   │                                  │                 │
│                   ▼                                  ▼                 │
│      ┌─────────────────────────┐        ┌─────────────────────────┐    │
│      │    BOH ViewModels       │        │     FOH ViewModels      │    │
│      │ (WhileSubscribed(5000)) │        │ (WhileSubscribed(5000)) │    │
│      └────────────┬────────────┘        └────────────┬────────────┘    │
│                   │                                  │                 │
│                   ▼                                  ▼                 │
│      ┌────────────────────────────────────────────────────────────┐    │
│      │              Domain Use Cases (Dispatchers.Default)        │    │
│      │  - ScaleRecipeQuantityUseCase                              │    │
│      │  - CalculateRecipeCostUseCase                              │    │
│      │  - GenerateDailyPrepListUseCase                            │    │
│      └────────────────────────────┬───────────────────────────────┘    │
│                                   │                                    │
│                                   ▼                                    │
│      ┌────────────────────────────────────────────────────────────┐    │
│      │              Repository Layer (StateFlow & Coroutines)     │    │
│      │  - RecipeRepo  - InventoryRepo  - PrepRepo  - SyncRepo     │    │
│      └────────────────────────────┬───────────────────────────────┘    │
│                                   │                                    │
│         ┌─────────────────────────┴─────────────────────────┐          │
│         ▼                                                   ▼          │
│┌──────────────────────────────────┐        ┌──────────────────────────┐│
││   Room Database (WAL Enabled)    │        │  P2P Sync Engine & NSD   ││
││  - @Transaction atomic writes    │        │  - Local HTTP Engine     ││
││  - IngredientEntity              │        │  - SyncEventQueue        ││
││  - RecipeEntity                  │        │  - mDNS Peer Discovery   ││
││  - RecipeIngredientEntity        │        │  - Delta Event Dispatch  ││
││  - InventoryItemEntity           │        └──────────────────────────┘│
││  - PrepItemEntity                │                                    │
││  - BanquetEventEntity            │                                    │
││  - SyncEventEntity               │                                    │
│└──────────────────────────────────┘                                    │
└────────────────────────────────────────────────────────────────────────┘
```

### Room Database DAOs & Atomic Transactions
- `RecipeDao`: Includes `@Transaction` method `insertRecipeWithIngredients(recipe: RecipeEntity, ingredients: List<RecipeIngredientEntity>)` to guarantee relational integrity.
- `PrepListDao`: Reactive queries returning `Flow<List<PrepItemEntity>>` observed via `WhileSubscribed(5000)`.
- `InventoryDao`: Reactive queries returning `Flow<List<InventoryItemEntity>>` with atomic `@Transaction` audit methods.
- `BanquetDao`: Atomic transactions generating banquet prep schedules from menu recipes.
- `SyncEventDao`: Appending immutable delta events to `sync_event_queue`.

### Android 13+ Kiosk Mode Implementation
```kotlin
fun enableKioskMode(activity: Activity) {
    activity.window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
    WindowCompat.setDecorFitsSystemWindows(activity.window, false)
    WindowInsetsControllerCompat(activity.window, activity.window.decorView).let { controller ->
        controller.hide(WindowInsetsCompat.Type.systemBars())
        controller.systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
    }
}
```

---

## 5. Implementation Roadmap

1. **Sprint 1: Core Foundation & Room Database Engine**:
   - Configure Room entities, DAOs (`PrepListDao`, `InventoryDao`, `RecipeDao`, `BanquetDao`, `SyncEventDao`) with `@Transaction` atomic blocks and SQLite WAL mode.
   - Implement `ChefAgentDatabase` and `AppContainer`.
   - Pre-populate database with country club hospitality seed data on first run.
2. **Sprint 2: Profile State Engine & BOH Kitchen Module**:
   - Implement `ProfileStateManager` with SHA-256 PIN verification (`1234`).
   - Implement `ScaleRecipeQuantityUseCase` and `BOHPrepViewModel` with `WhileSubscribed(5000)`.
   - Build `BOHPrepListScreen` with 64dp+ touch targets, station filters, and zero-latency single-tap completion.
   - Build `BOHRecipeScaleScreen` for instant batch yield scaling.
3. **Sprint 3: FOH Management & Costing Module**:
   - Implement `CalculateRecipeCostUseCase` and menu margin analysis.
   - Build `FOHInventoryAuditScreen` with rapid quantity reconciliation and low-stock par alerts.
   - Build `FOHMarginDashboardScreen` with interactive FCP gauges and margin squeeze indicators.
   - Build `BOHBanquetBreakdownScreen` for event cover prep calculation.
4. **Sprint 4: Local P2P Sync & Event Queue**:
   - Implement `PeerSyncEngine` with local network discovery (NSD) and embedded HTTP sync endpoint.
   - Connect mutations in prep, inventory, and scaling to `SyncEventQueue` with visual sync telemetry badge.
5. **Sprint 5: Kiosk Lockdown & MainActivity Integration**:
   - Implement `WindowInsetsControllerCompat` kiosk mode with `BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE` and `FLAG_KEEP_SCREEN_ON`.
   - Update `metadata.json` and `strings.xml` to "ChefAgent".
   - Compile and verify with `compile_applet`.
