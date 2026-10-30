package com.agency.chefagent.domain

import android.util.Log
import com.agency.chefagent.data.local.PrepItemDao
import com.agency.chefagent.data.local.PrepItemEntity
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlin.math.max
import kotlin.math.min

/**
 * VisionAcousticFusionEngine.kt
 *
 * Multimodal Decision Matrix Service for BOH Kitchens.
 * Fuses acoustic vernacular transcripts with real-time station computer vision bounding boxes
 * to confirm automated "86" stock deductions or flag visual-speech conflicts.
 *
 * Probabilistic Confidence Score Fusion Model:
 *   Confidence_final = (alpha * Score_audio) + (beta * Score_vision)
 *   where alpha + beta = 1.0
 */

data class VisionBoundingBoxData(
    val id: String,
    val label: String,
    val confidence: Double,
    val x: Double,
    val y: Double,
    val width: Double,
    val height: Double,
    val stationId: String,
    val fillLevelPercentage: Double,
    val anomalyFlag: Boolean,
    val safetyViolation: String
)

data class MultimodalFusionResultData(
    val finalConfidence: Double,
    val audioScore: Double,
    val visionScore: Double,
    val alpha: Double,
    val beta: Double,
    val confirmedAction: FusionAction,
    val targetRecipeOrItemName: String,
    val visualStationId: String,
    val fillLevelPercentage: Double,
    val anomalyFlag: Boolean,
    val rationaleText: String,
    val timestamp: Long = System.currentTimeMillis()
)

enum class FusionAction {
    CONFIRM_86,
    CONFLICT_REJECT,
    PAN_DEPLETED_AUTO_86,
    PLATING_FIRE_VALIDATED,
    REQUIRE_CHEF_OVERRIDE
}

class VisionAcousticFusionEngine(
    private val prepItemDao: PrepItemDao
) {
    private val tag = "VisionAcousticFusion"

    companion object {
        private const val DEFAULT_ALPHA = 0.45 // Audio weight
        private const val DEFAULT_BETA = 0.55  // Vision weight
        private const val CONFIDENCE_THRESHOLD_CONFIRM = 0.78
    }

    /**
     * Evaluates fused multimodal confidence across audio transcript and visual telemetry frame.
     */
    suspend fun processMultimodalFrame(
        audioTranscript: String,
        audioRms: Double,
        audioConfidence: Double,
        visualDetections: List<VisionBoundingBoxData>,
        stationId: String
    ): MultimodalFusionResultData = withContext(Dispatchers.IO) {

        // 1. Compute dynamic environmental weights (Alpha & Beta)
        var alpha = DEFAULT_ALPHA
        var beta = DEFAULT_BETA

        // High ambient noise (sizzling burners, vent hoods) reduces audio weight
        if (audioRms > 3500.0) {
            alpha = 0.25
            beta = 0.75
        } else if (audioRms < 1000.0) {
            alpha = 0.55
            beta = 0.45
        }

        // Normalize weights alpha + beta = 1.0
        val weightSum = alpha + beta
        alpha = Math.round((alpha / weightSum) * 100.0) / 100.0
        beta = Math.round((1.0 - alpha) * 100.0) / 100.0

        // 2. Parse Audio Intent & Target Keyword
        val transcriptLower = audioTranscript.lowercase().trim()
        val is86Command = transcriptLower.contains("86") || transcriptLower.contains("eighty-six") || transcriptLower.contains("out of stock")
        val isFireCommand = transcriptLower.contains("fire table")

        var extractedItemName = ""
        if (is86Command) {
            extractedItemName = transcriptLower
                .replace(Regex("""(86|eighty-six|out\s+of\s+stock|the)"""), "")
                .trim()
        }

        // 3. Inspect visual bounding box for target item
        var matchedBox: VisionBoundingBoxData? = null
        if (extractedItemName.isNotEmpty() && visualDetections.isNotEmpty()) {
            matchedBox = visualDetections.find { box ->
                box.label.lowercase().contains(extractedItemName) ||
                extractedItemName.contains(box.label.lowercase())
            }
        }

        if (matchedBox == null && visualDetections.isNotEmpty()) {
            matchedBox = visualDetections
                .filter { it.stationId == stationId }
                .maxByOrNull { it.confidence }
        }

        val visionScore = matchedBox?.confidence ?: 0.20
        val audioScore = if (audioConfidence > 0) audioConfidence else 0.50

        // 4. Calculate Probabilistic Fusion Score
        // Confidence_final = (alpha * Score_audio) + (beta * Score_vision)
        var finalConfidence = Math.round(((alpha * audioScore) + (beta * visionScore)) * 100.0) / 100.0

        // 5. Decision Matrix Strategy
        var confirmedAction = FusionAction.REQUIRE_CHEF_OVERRIDE
        var anomalyFlag = false
        var rationaleText = ""
        val panFillPct = matchedBox?.fillLevelPercentage ?: 0.0

        if (is86Command) {
            if (matchedBox != null && panFillPct <= 10.0) {
                // Cross-Modal Agreement: Audio says 86 and pan is empty!
                finalConfidence = min(1.0, finalConfidence + 0.25)
                confirmedAction = FusionAction.CONFIRM_86
                rationaleText = "Audio '86' command for '$extractedItemName' validated by camera (Pan fill $panFillPct%). Fused confidence ${(finalConfidence * 100).toInt()}%."

                // Execute LWW state update on local SQLite WAL DB
                executeAuto86Deduction(extractedItemName, stationId, panFillPct)
            } else if (matchedBox != null && panFillPct >= 60.0) {
                // VISUAL-SPEECH CONFLICT: Cook said 86, but camera detects pan is 60%+ full!
                confirmedAction = FusionAction.CONFLICT_REJECT
                anomalyFlag = true
                rationaleText = "CONFLICT: Audio requested 86 for '$extractedItemName', but camera detects pan is $panFillPct% full. Chef confirmation required."
            } else {
                if (finalConfidence >= CONFIDENCE_THRESHOLD_CONFIRM) {
                    confirmedAction = FusionAction.CONFIRM_86
                    rationaleText = "86 command confirmed with fused confidence ${(finalConfidence * 100).toInt()}%."
                    executeAuto86Deduction(extractedItemName, stationId, panFillPct)
                } else {
                    confirmedAction = FusionAction.REQUIRE_CHEF_OVERRIDE
                    rationaleText = "Insufficient confidence (${(finalConfidence * 100).toInt()}%) for automated 86."
                }
            }
        } else if (matchedBox != null && panFillPct <= 5.0 && !is86Command) {
            // Visual Pan Depletion without explicit audio call
            confirmedAction = FusionAction.PAN_DEPLETED_AUTO_86
            anomalyFlag = true
            finalConfidence = max(finalConfidence, 0.92)
            rationaleText = "AUTOMATED ALERT: Station pan '${matchedBox.label}' reached $panFillPct% fill level without explicit voice call. Auto-suggesting 86 status."
            executeAuto86Deduction(matchedBox.label, stationId, panFillPct)
        } else if (isFireCommand) {
            confirmedAction = FusionAction.PLATING_FIRE_VALIDATED
            rationaleText = "Fire Table call validated against station prep line."
        } else {
            confirmedAction = if (finalConfidence >= 0.8) FusionAction.PLATING_FIRE_VALIDATED else FusionAction.REQUIRE_CHEF_OVERRIDE
            rationaleText = "Routine vision-acoustic frame evaluated. Fused score: ${(finalConfidence * 100).toInt()}%."
        }

        Log.i(tag, "Multimodal Fusion Evaluated -> Action: $confirmedAction | Fused Conf: $finalConfidence | Alpha: $alpha | Beta: $beta")

        return@withContext MultimodalFusionResultData(
            finalConfidence = finalConfidence,
            audioScore = audioScore,
            visionScore = visionScore,
            alpha = alpha,
            beta = beta,
            confirmedAction = confirmedAction,
            targetRecipeOrItemName = extractedItemName.ifEmpty { matchedBox?.label ?: "Station Item" },
            visualStationId = stationId,
            fillLevelPercentage = panFillPct,
            anomalyFlag = anomalyFlag,
            rationaleText = rationaleText
        )
    }

    private suspend fun executeAuto86Deduction(itemName: String, stationId: String, fillLevel: Double) {
        try {
            val prepItems = prepItemDao.getAllPrepItems()
            val targetItem = prepItems.find { item ->
                item.recipeName.lowercase().contains(itemName.lowercase()) ||
                itemName.lowercase().contains(item.recipeName.lowercase())
            }

            if (targetItem != null) {
                prepItemDao.updateVisionTelemetryWithLww(
                    id = targetItem.id,
                    fillLevel = fillLevel,
                    anomalyFlag = fillLevel <= 5.0,
                    stationId = stationId,
                    detectedClass = itemName,
                    timestamp = System.currentTimeMillis()
                )
                Log.i(tag, "Updated Room DB prep item ${targetItem.id} ('${targetItem.recipeName}') fill level to $fillLevel% with LWW timestamp.")
            }
        } catch (e: Exception) {
            Log.e(tag, "Error updating Room DB in executeAuto86Deduction", e)
        }
    }
}
