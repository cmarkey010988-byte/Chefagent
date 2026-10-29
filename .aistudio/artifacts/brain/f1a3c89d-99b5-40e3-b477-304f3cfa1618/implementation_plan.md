# Chronos Acoustic Orchestration Engine: Architectural Implementation Plan

An end-to-end proprietary orchestration engine for **ChefAgent**, transforming static prep lists into a reverse-calculated, dependency-aware dynamic timeline with a real-time **Burn Line**, coupled with an ambient acoustic listener service capturing kitchen vernacular for hands-free state transitions across Kotlin/Room DB and the React/TypeScript BOH interface.

---

## Confirmed User Decisions & System Directives

> [!IMPORTANT]
> **Summary of Confirmed Architectural Decisions (from Turn 1 Clarifications)**:
> 1. **Chronos Timeline View Layout**:
>    - *Confirmed Decision*: **Dual layout toggle with horizontal Gantt lane and vertical countdown feed**. Chefs can toggle between a continuous horizontal time track showing station lanes and dependency linkages, and a focused vertical countdown feed prioritizing immediate tasks approaching the Burn Line.
> 2. **Buffer Slack Allocation in Reverse-Scheduling**:
>    - *Confirmed Decision*: **Add a configurable 15-minute staging buffer between dependent tasks**. Reverse calculations subtract each task's `laborMinutesRequired` plus a 15-minute resting, cooling, or station-transfer staging window before predecessor tasks must fire.
> 3. **Ambient Kitchen Listener Processing**:
>    - *Confirmed Decision*: **Hybrid local keyword heuristic with fast audio endpoint fallback**. Low-latency string and phoneme heuristic detects high-frequency operational calls (*"Fire Table [X]"*, *"86 [Ingredient]"*, *"Push [Event]"*) in <100ms on-device, falling back to a lightweight audio endpoint for complex phrasing.
> 4. **Design System & Ergonomics**:
>    - Matte Dark background (`#121212` / `bg-slate-950`), Kitchen Amber (`#FF9800` / `text-amber-400`), Emerald Green (`#1B5E20` / `text-emerald-500`), and Live Crimson Burn Line (`#EF4444` / `border-rose-500`). Touch targets $\ge 64\text{dp}$.

---

## 1. System Architecture & Chronos Flow

```
┌───────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                              CHRONOS ACOUSTIC ORCHESTRATION ENGINE                                    │
├───────────────────────────────────────────────────┬───────────────────────────────────────────────────┤
│        CHRONOS REVERSE-TIMELINE SCHEDULING        │             AMBIENT ACOUSTIC LISTENER             │
│                                                   │                                                   │
│  Banquet Event / Dinner Service Target Plating    │  Rolling 5-Second Circular Audio Buffer           │
│  (e.g., Gala Dinner: 19:30 Plating Time)          │  (Android AudioRecord / Web Audio PCM Stream)     │
│                        │                          │                        │                          │
│                        ▼                          │                        ▼                          │
│  ChronosSchedulingUseCase (Dispatchers.Default)   │  AmbientKitchenListenerService                    │
│  • Topological sort on task dependencies          │  • Fast regex heuristic (<100ms)                  │
│  • Target Fire = Plating Time - Labor - 15m Buffer│  • "Fire Table 4", "86 Halibut", "Push Banquet"   │
│                        │                          │                        │                          │
│                        ▼                          │                        ▼                          │
│  PrepItemEntity & Room DAO (Flow Conflation)      │  handleVoiceCommand Dispatcher                    │
│  • targetFireTimestamp, duration, dependencies    │  • Instant DB write with Dispatchers.IO           │
│                        │                          │  • ACID LocalStorage update & P2P WAL sync        │
│                        ▼                          │                        ▼                          │
│  ┌─────────────────────────────────────────────────────────────────────────────────────────────────┐  │
│  │ BOH Chronos Timeline View (StationPrepBoard.tsx & BOHPrepListScreen.kt)                         │  │
│  │ • Horizontal Station Gantt Tracks & Vertical Priority Countdown Feed                            │  │
│  │ • Moving Crimson Burn Line (#EF4444) tracking wall-clock time                                  │  │
│  │ • Pulse Amber (<15 min to Burn Line) · Flash Crimson (Past Burn Line uncompleted)               │  │
│  └─────────────────────────────────────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Technical Specifications & Deliverables

### Deliverable 1: Data Layer Expansion (Kotlin + TypeScript Shared Contracts)
1. **Kotlin Android Room Entity Updates (`PrepItemEntity.kt`)**:
   - `targetFireTimestamp: Long?`: Computed epoch millisecond timestamp when line cooks must start prep.
   - `estimatedDurationMinutes: Int`: Total expected active execution time.
   - `dependencies: List<String>`: List of prerequisite `PrepItem` IDs stored via `DependenciesTypeConverter` (`@TypeConverter`).
   - `chronosStage: ChronosStage`: Enum (`FABRICATION`, `SUB_RECIPE`, `HOT_HOLD`, `PLATING_FIRE`).
2. **Room DAO Method (`PrepItemDao.kt`)**:
   - `@Query("SELECT * FROM prep_items WHERE stationAssignment = :station OR :station = 'ALL' ORDER BY targetFireTimestamp ASC")`
   - `fun observeChronosTimeline(station: String): Flow<List<PrepItemEntity>>` with conflation support (`WhileSubscribed(5000)`).
3. **Chronos Scheduling Use Case (`ChronosSchedulingUseCase.kt` & `ChronosScheduler.ts`)**:
   - Takes `targetPlatingTimestamp: Long` and associated prep item graph.
   - Builds a Directed Acyclic Graph (DAG) using dependencies.
   - Computes reverse timestamps:
     $$\text{TargetFire}_{i} = \text{TargetPlating} - \sum \text{Duration} - (N_{\text{steps}} \times 15\text{ min buffer})$$
   - Executes strictly on `Dispatchers.Default` (zero network latency, 100% offline).
4. **TypeScript Contracts (`src/types/chronos.ts`)**:
   - Shared data contracts mirroring Kotlin Room entities for web applet execution.

### Deliverable 2: Ambient Acoustic Listener (Kotlin + Web Audio Parallel)
1. **Android Foreground Service (`AmbientKitchenListenerService.kt`)**:
   - Uses `AudioRecord` (16kHz mono, 16-bit PCM) maintaining a circular 5-second `ByteArray` ring buffer.
   - Low-latency local keyword matcher listening continuously for:
     - `"Fire Table [X]"` $\rightarrow$ sets table state to `ENTREE_PHASE` and triggers ticket timer.
     - `"86 [Ingredient]"` $\rightarrow$ de-lists item and broadcasts warning banner.
     - `"Push [Event / Recipe]"` $\rightarrow$ triggers prep item fire sequence.
   - Emits state updates directly to local database through repository on `Dispatchers.IO`.
2. **React / Web Audio Implementation (`src/hooks/useAmbientKitchenListener.ts`)**:
   - Browser counterpart utilizing Web Audio API + Speech Recognition with local intent parser.
   - Provides visual waveform meter and ambient kitchen tracking HUD.

### Deliverable 3: BOH UI Evolution (Chronos Timeline & Burn Line)
1. **Refactored `StationPrepBoard.tsx`**:
   - **Chronos Mode Switcher**: Toggle between `[ 📊 Standard Board ]` and `[ ⏱️ Chronos Timeline ]`.
   - **Sub-Layout Toggle**: `[ ↔ Horizontal Station Gantt ]` vs `[ ↕ Vertical Countdown Feed ]`.
   - **Horizontal Gantt Track**:
     - Time header with 15-minute divisions.
     - Station swimlanes (*Sauce/Sauté*, *Butchery*, *Garde Manger*, *Grill*, *Pastry*).
     - Task blocks positioned based on `targetFireTimestamp` to `targetFireTimestamp + estimatedDurationMinutes`.
   - **Vertical Countdown Feed**:
     - Urgent queue ordered chronologically by minutes until fire (`T-45m`, `T-12m`, `T+5m LATE`).
   - **Real-Time Crimson Burn Line (`#EF4444`)**:
     - Synchronized with live wall clock (`Date.now()`).
     - Visual indicator line drawn across timeline.
     - **Urgency states**:
       - *Normal*: Slate card border.
       - *Urgent (<15 min to Burn Line)*: Pulsing Kitchen Amber (`#FF9800`) border and glow.
       - *Overdue / Burn Warning*: Flashing Crimson (`#EF4444`) alert with audio chime warning.

---

## 3. Implementation Plan & Deliverables Sequence

| Phase | Deliverable File(s) | Description |
|:---|:---|:---|
| **Phase 1** | `src/types/chronos.ts`<br>`src/types/index.ts` | TypeScript Chronos data models: `ChronosTimelineItem`, `ChronosStage`, `ChronosScheduleResult`. |
| **Phase 2** | `src/utils/ChronosScheduler.ts`<br>`android/ChronosSchedulingUseCase.kt` | Reverse-scheduling topological algorithm with 15-minute staging buffers on `Dispatchers.Default`. |
| **Phase 3** | `android/PrepItemEntity.kt`<br>`android/PrepItemDao.kt`<br>`android/DependenciesTypeConverter.kt` | Kotlin Room entity updates with `targetFireTimestamp`, duration, dependencies, and `observeChronosTimeline()`. |
| **Phase 4** | `android/AmbientKitchenListenerService.kt`<br>`src/hooks/useAmbientKitchenListener.ts` | 5-second circular audio buffer foreground service and web acoustic listener hook. |
| **Phase 5** | `src/components/boh/ChronosGanttLane.tsx`<br>`src/components/boh/ChronosCountdownFeed.tsx` | Horizontal station swimlanes and vertical chronological countdown feed with dependency arrows. |
| **Phase 6** | `src/components/boh/ChronosBurnLine.tsx`<br>`src/components/boh/StationPrepBoard.tsx` | Real-time moving Burn Line indicator, amber pulse (<15m), and crimson flashing overdue states. |
| **Phase 7** | Verification & Compilation | Execute `lint_applet` (`tsc --noEmit`) and `compile_applet` (`npm run build`). |

---

## 4. Verification Plan

- **Algorithm Verification**: Unit test `ChronosScheduler.ts` with a 3-tier dependent banquet menu (Braised Short Rib: Butchery marinade $\rightarrow$ Stock braise $\rightarrow$ Glaze finish) verifying exact target fire timestamps.
- **Burn Line Timing**: Validate that advancing the simulated clock accurately transitions tasks from Normal $\rightarrow$ Pulsing Amber ($\le 15\text{m}$) $\rightarrow$ Flashing Crimson ($> 0\text{m}$ past target).
- **TypeScript & Build Integrity**: Run `lint_applet` and `compile_applet` to confirm zero errors.
