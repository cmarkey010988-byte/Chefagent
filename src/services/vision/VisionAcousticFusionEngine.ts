/**
 * src/services/vision/VisionAcousticFusionEngine.ts
 *
 * TypeScript implementation of the Multimodal AI Vision & Acoustic Fusion Engine.
 * Evaluates audio transcripts, RMS noise level, and visual bounding box detections
 * using the probabilistic confidence score fusion algorithm:
 *
 * Confidence_final = (alpha * Score_audio) + (beta * Score_vision)
 * where alpha + beta = 1.0
 */

import {
  MultimodalFusionRequest,
  MultimodalFusionResult,
  VisionBoundingBox,
  FusionActionType,
} from '../../types/vision';

export class VisionAcousticFusionEngine {
  private static readonly DEFAULT_ALPHA = 0.45; // Audio baseline weight
  private static readonly DEFAULT_BETA = 0.55;  // Vision baseline weight
  private static readonly CONFIDENCE_THRESHOLD_CONFIRM = 0.78;

  /**
   * Evaluates fused confidence for audio-visual cross-modal validation or conflict resolution.
   */
  public static evaluateFusion(request: MultimodalFusionRequest): MultimodalFusionResult {
    const {
      audioTranscript,
      audioRms,
      audioConfidence,
      visualDetections,
      stationId,
    } = request;

    // 1. Calculate dynamic alpha/beta weights based on ambient acoustic noise (RMS)
    let alpha = request.audioWeightAlpha ?? this.DEFAULT_ALPHA;
    let beta = request.visionWeightBeta ?? this.DEFAULT_BETA;

    // High kitchen noise (e.g. hood exhaust, searing oil, dish pit) reduces audio weight
    if (audioRms > 3500) {
      alpha = 0.25;
      beta = 0.75;
    } else if (audioRms < 1000) {
      alpha = 0.55;
      beta = 0.45;
    }

    // Ensure normalization alpha + beta = 1.0
    const weightSum = alpha + beta;
    alpha = Math.round((alpha / weightSum) * 100) / 100;
    beta = Math.round((1.0 - alpha) * 100) / 100;

    // 2. Parse Audio Intent & Target Item
    const transcriptLower = audioTranscript.toLowerCase();
    const is86Command = transcriptLower.includes('86') || transcriptLower.includes('eighty-six') || transcriptLower.includes('out of stock');
    const isFireCommand = transcriptLower.includes('fire table');

    let extractedItemName = '';
    if (is86Command) {
      extractedItemName = transcriptLower
        .replace(/(86|eighty-six|out of stock|the)/g, '')
        .trim();
    }

    // 3. Inspect visual bounding boxes for target item match
    let matchedBox: VisionBoundingBox | undefined = undefined;
    if (extractedItemName && visualDetections.length > 0) {
      matchedBox = visualDetections.find(box =>
        box.label.toLowerCase().includes(extractedItemName) ||
        extractedItemName.includes(box.label.toLowerCase())
      );
    }

    // Fallback: take highest confidence box on station if no name match
    if (!matchedBox && visualDetections.length > 0) {
      matchedBox = visualDetections
        .filter(b => b.stationId === stationId)
        .sort((a, b) => b.confidence - a.confidence)[0];
    }

    const visionScore = matchedBox ? matchedBox.confidence : 0.2;
    const audioScore = audioConfidence > 0 ? audioConfidence : 0.5;

    // 4. Calculate Probabilistic Fusion Score
    // Confidence_final = (alpha * Score_audio) + (beta * Score_vision)
    let finalConfidence = Math.round(((alpha * audioScore) + (beta * visionScore)) * 100) / 100;

    // 5. Decision Matrix & Action Determination
    let confirmedAction: FusionActionType = 'REQUIRE_CHEF_OVERRIDE';
    let anomalyFlag = false;
    let rationaleText = '';

    const panFillPct = matchedBox ? matchedBox.fillLevelPercentage : 0;

    if (is86Command) {
      // Cross-Modal Validation for "86" command:
      // If camera sees pan fill <= 10%, vision strongly validates the audio command!
      if (matchedBox && panFillPct <= 10) {
        finalConfidence = Math.min(1.0, finalConfidence + 0.25); // Boost score due to visual agreement
        confirmedAction = 'CONFIRM_86';
        rationaleText = `Audio 86 command for '${extractedItemName}' validated by camera (Pan fill at ${panFillPct}%). Fused confidence: ${(finalConfidence * 100).toFixed(0)}%.`;
      } else if (matchedBox && panFillPct >= 60) {
        // CONFLICT DETECTED: Cook said "86 Salmon" but camera sees 60%+ full pan!
        confirmedAction = 'CONFLICT_REJECT';
        anomalyFlag = true;
        rationaleText = `CONFLICT: Audio requested 86 for '${extractedItemName}', but camera detects station pan is ${panFillPct}% full. Chef confirmation required.`;
      } else {
        if (finalConfidence >= this.CONFIDENCE_THRESHOLD_CONFIRM) {
          confirmedAction = 'CONFIRM_86';
          rationaleText = `86 action confirmed with fused confidence ${(finalConfidence * 100).toFixed(0)}%.`;
        } else {
          confirmedAction = 'REQUIRE_CHEF_OVERRIDE';
          rationaleText = `Insufficient confidence (${(finalConfidence * 100).toFixed(0)}%) for automated 86. Manual override required.`;
        }
      }
    } else if (matchedBox && panFillPct <= 5 && !is86Command) {
      // Pan Depleted Without Audio Command -> Auto-Suggest 86
      confirmedAction = 'PAN_DEPLETED_AUTO_86';
      anomalyFlag = true;
      finalConfidence = Math.max(finalConfidence, 0.92);
      rationaleText = `AUTOMATED ALERT: Station pan '${matchedBox.label}' reached 0-5% fill level without explicit voice command. Auto-suggesting 86 status.`;
    } else if (isFireCommand) {
      confirmedAction = 'PLATING_FIRE_VALIDATED';
      rationaleText = `Fire Table command validated across station timeline. Fused confidence ${(finalConfidence * 100).toFixed(0)}%.`;
    } else {
      confirmedAction = finalConfidence >= 0.8 ? 'PLATING_FIRE_VALIDATED' : 'REQUIRE_CHEF_OVERRIDE';
      rationaleText = `Routine telemetry frame evaluated. Fused score: ${(finalConfidence * 100).toFixed(0)}%.`;
    }

    return {
      finalConfidence,
      audioScore,
      visionScore,
      alpha,
      beta,
      confirmedAction,
      targetRecipeOrItemName: extractedItemName || (matchedBox ? matchedBox.label : 'Station Item'),
      visualStationId: stationId,
      fillLevelPercentage: panFillPct,
      anomalyFlag,
      rationaleText,
      timestamp: Date.now(),
    };
  }
}
