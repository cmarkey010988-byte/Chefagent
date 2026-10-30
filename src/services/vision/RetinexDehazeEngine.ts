/**
 * src/services/vision/RetinexDehazeEngine.ts
 *
 * Environmental Optics & Optical Recovery Subsystem:
 * 1. Dynamic Frame Decimation & Motion Vector Detection (Static > 3s -> 2 FPS, Motion -> 30 FPS)
 * 2. Multi-Scale Retinex Contrast Enhancement for steam/grease plume recovery
 * 3. Thermal-Acoustic Lens Micro-Heater Bezel Controller
 * 4. Gastronorm (GN) Pan Tare & Perspective Geometry Calibrator
 */

import {
  GastronormStandard,
  GastronormTareProfile,
  FrameDecimationMode,
  MicroHeaterState,
} from '../../types/vision';

export class RetinexDehazeEngine {
  public static readonly MOTION_THRESHOLD = 0.08; // 8% pixel luminance change triggers active mode
  public static readonly STATIC_TIMEOUT_MS = 3000; // 3 seconds static -> 2 FPS decimation

  // Standard Gastronorm Pan nominal dimensions (mm)
  public static readonly GN_DIMENSIONS: Record<GastronormStandard, { widthMm: number; lengthMm: number; defaultTareGrams: number }> = {
    GN_1_1: { widthMm: 325, lengthMm: 530, defaultTareGrams: 1420 },
    GN_1_2: { widthMm: 325, lengthMm: 265, defaultTareGrams: 780 },
    GN_1_3: { widthMm: 325, lengthMm: 176, defaultTareGrams: 540 },
    GN_1_6: { widthMm: 176, lengthMm: 162, defaultTareGrams: 310 },
    CUSTOM: { widthMm: 300, lengthMm: 300, defaultTareGrams: 600 },
  };

  /**
   * Computes normalized motion vector delta (0.0 to 1.0) between consecutive frame luminance samples.
   */
  public static computeMotionVectorDelta(prevSamples: number[], currSamples: number[]): number {
    if (!prevSamples.length || !currSamples.length || prevSamples.length !== currSamples.length) {
      return 0.0;
    }

    let absoluteDiffSum = 0;
    const len = prevSamples.length;

    for (let i = 0; i < len; i++) {
      absoluteDiffSum += Math.abs(currSamples[i] - prevSamples[i]);
    }

    // Normalized difference against maximum 255.0 scale
    const meanDiff = absoluteDiffSum / len;
    return Math.min(1.0, Math.round((meanDiff / 255.0) * 1000) / 1000);
  }

  /**
   * Decimates inference frequency dynamically:
   * When motion detector registers static pan state for >3.0s, drops inference frequency to 2 FPS.
   * Scaling back to 30 FPS immediately upon motion vector deltas >= 0.08.
   */
  public static determineDecimationFps(
    staticDurationMs: number,
    motionVectorDelta: number,
    currentMode: FrameDecimationMode
  ): { fps: number; mode: FrameDecimationMode; shouldDecimate: boolean } {
    if (motionVectorDelta >= this.MOTION_THRESHOLD) {
      // Rapid motion detected (cook moving pan, knife activity, plating fire) -> 30 FPS
      return {
        fps: 30,
        mode: 'ACTIVE_MOTION_30FPS',
        shouldDecimate: false,
      };
    }

    if (staticDurationMs >= this.STATIC_TIMEOUT_MS) {
      // Pans have been stationary for > 3 seconds -> 2 FPS to save NPU power/thermal budget
      return {
        fps: 2,
        mode: 'IDLE_DECIMATED_2FPS',
        shouldDecimate: true,
      };
    }

    // Keep current mode during ramp-down window
    return {
      fps: currentMode === 'IDLE_DECIMATED_2FPS' ? 2 : 30,
      mode: currentMode,
      shouldDecimate: currentMode === 'IDLE_DECIMATED_2FPS',
    };
  }

  /**
   * Multi-Scale Retinex (MSR) digital de-hazing algorithm.
   * Normalizes steam plumes and grease haze by computing log(I) - sum(w * log(I * G))
   * Enhanced with dynamic range scaling for edge pipeline byte arrays.
   */
  public static applyMultiScaleRetinexDehaze(pixelValues: number[], scales: number[] = [15, 80, 250]): number[] {
    if (!pixelValues.length) return [];

    const weights = [1 / 3, 1 / 3, 1 / 3];
    const output: number[] = new Array(pixelValues.length);

    // Compute approximate local gaussian blur surround across scales
    for (let i = 0; i < pixelValues.length; i++) {
      const val = Math.max(1, pixelValues[i]);
      let retinexSum = 0;

      for (let s = 0; s < scales.length; s++) {
        const radius = Math.max(1, Math.floor(scales[s] / 10));
        let surroundSum = 0;
        let count = 0;

        for (let offset = -radius; offset <= radius; offset++) {
          const idx = i + offset;
          if (idx >= 0 && idx < pixelValues.length) {
            surroundSum += pixelValues[idx];
            count++;
          }
        }

        const surroundAvg = Math.max(1, surroundSum / count);
        // Retinex formula: log(val) - log(surroundAvg)
        retinexSum += weights[s] * (Math.log(val) - Math.log(surroundAvg));
      }

      // Re-scale dynamic contrast back to [0..255]
      const enhanced = Math.round(128 + retinexSum * 64);
      output[i] = Math.max(0, Math.min(255, enhanced));
    }

    return output;
  }

  /**
   * Thermal-Acoustic Lens Micro-Heater Bezel Controller:
   * Detects grease fog or steam condensation and drives the micro-heater grid.
   */
  public static evaluateLensDefogMicroHeaterTrigger(
    steamObscurationLevel: number,
    greaseFilmVariance: number,
    ambientTempC: number
  ): { heaterAction: MicroHeaterState; targetTempC: number; rationale: string } {
    // If steam obscuration > 40% or grease film variance > 50%, engage continuous defogger
    if (steamObscurationLevel >= 40 || greaseFilmVariance >= 50) {
      return {
        heaterAction: 'CONTINUOUS_DEFOG',
        targetTempC: 52.0, // Active thermal sublimation target
        rationale: `Severe optical fogging detected (Steam: ${steamObscurationLevel}%, Grease: ${greaseFilmVariance}%). Driving micro-heater grid to 52°C.`,
      };
    }

    // Moderate steam or high humidity in hot line -> Pulse mode to prevent condensation
    if (steamObscurationLevel > 15 || ambientTempC > 45) {
      return {
        heaterAction: 'PULSING',
        targetTempC: 44.0,
        rationale: `Elevated ambient humidity/line heat. Micro-heater running in thermal pulse mode at 44°C.`,
      };
    }

    return {
      heaterAction: 'STANDBY',
      targetTempC: ambientTempC,
      rationale: `Optical path clear. Micro-heater in low-power standby.`,
    };
  }

  /**
   * Gastronorm (GN) Pan Tare & Perspective Geometry Calibrator:
   * Recognizes standard GN pan dimensions and computes perspective skew compensation.
   */
  public static calibrateGastronormTare(
    standard: GastronormStandard,
    measuredWidthPx: number,
    measuredHeightPx: number,
    expectedAspectRatio?: number
  ): GastronormTareProfile {
    const dim = this.GN_DIMENSIONS[standard];
    const expectedRatio = expectedAspectRatio ?? (dim.lengthMm / dim.widthMm);
    const measuredRatio = measuredWidthPx > 0 ? measuredHeightPx / measuredWidthPx : 1.0;

    // Calculate optical skew matrix coefficients
    const skewCorrection = Math.round((expectedRatio / Math.max(0.1, measuredRatio)) * 1000) / 1000;
    const skewMatrix: [number, number, number, number] = [1.0, 0.0, 0.0, skewCorrection];

    // Estimate specular reflection tare for stainless steel pans
    const specularTarePct = standard === 'GN_1_1' ? 8.5 : standard === 'GN_1_2' ? 6.0 : 4.5;

    return {
      standard,
      nominalWidthMm: dim.widthMm,
      nominalLengthMm: dim.lengthMm,
      opticalSkewMatrix: skewMatrix,
      tareWeightGrams: dim.defaultTareGrams,
      specularReflectanceTarePct: specularTarePct,
      isCalibrated: true,
      calibratedAt: Date.now(),
    };
  }
}
