import test from 'node:test';
import assert from 'node:assert/strict';
import { VisionAcousticFusionEngine } from './VisionAcousticFusionEngine';
import { VisionBoundingBox } from '../../types/vision';

test('VisionAcousticFusionEngine - validates 86 command when visual pan is empty', () => {
  const sampleBoxes: VisionBoundingBox[] = [
    {
      id: 'box-1',
      label: 'Salmon Fillets',
      confidence: 0.92,
      x: 0.2,
      y: 0.3,
      width: 0.25,
      height: 0.25,
      stationId: 'Sauce/Sauté',
      fillLevelPercentage: 5, // Empty pan!
      anomalyFlag: false,
      safetyViolation: 'NONE',
    },
  ];

  const result = VisionAcousticFusionEngine.evaluateFusion({
    audioTranscript: '86 Salmon',
    audioRms: 1500,
    audioConfidence: 0.88,
    visualDetections: sampleBoxes,
    stationId: 'Sauce/Sauté',
  });

  assert.equal(result.confirmedAction, 'CONFIRM_86');
  assert.ok(result.finalConfidence >= 0.85);
  assert.equal(result.targetRecipeOrItemName, 'salmon');
  assert.equal(result.fillLevelPercentage, 5);
});

test('VisionAcousticFusionEngine - detects CONFLICT when 86 command is spoken but pan is 80% full', () => {
  const sampleBoxes: VisionBoundingBox[] = [
    {
      id: 'box-2',
      label: 'Salmon Fillets',
      confidence: 0.95,
      x: 0.2,
      y: 0.3,
      width: 0.25,
      height: 0.25,
      stationId: 'Sauce/Sauté',
      fillLevelPercentage: 80, // Full pan!
      anomalyFlag: false,
      safetyViolation: 'NONE',
    },
  ];

  const result = VisionAcousticFusionEngine.evaluateFusion({
    audioTranscript: '86 Salmon',
    audioRms: 1500,
    audioConfidence: 0.85,
    visualDetections: sampleBoxes,
    stationId: 'Sauce/Sauté',
  });

  assert.equal(result.confirmedAction, 'CONFLICT_REJECT');
  assert.equal(result.anomalyFlag, true);
  assert.ok(result.rationaleText.includes('CONFLICT'));
});

test('VisionAcousticFusionEngine - triggers PAN_DEPLETED_AUTO_86 when pan reaches 0% without audio command', () => {
  const sampleBoxes: VisionBoundingBox[] = [
    {
      id: 'box-3',
      label: 'Bernaise Sauce',
      confidence: 0.90,
      x: 0.1,
      y: 0.1,
      width: 0.2,
      height: 0.2,
      stationId: 'Sauce/Sauté',
      fillLevelPercentage: 2, // Depleted
      anomalyFlag: true,
      safetyViolation: 'NONE',
    },
  ];

  const result = VisionAcousticFusionEngine.evaluateFusion({
    audioTranscript: '',
    audioRms: 800,
    audioConfidence: 0.0,
    visualDetections: sampleBoxes,
    stationId: 'Sauce/Sauté',
  });

  assert.equal(result.confirmedAction, 'PAN_DEPLETED_AUTO_86');
  assert.equal(result.anomalyFlag, true);
  assert.ok(result.finalConfidence >= 0.90);
});

test('VisionAcousticFusionEngine - adapts alpha and beta weights in high ambient kitchen noise', () => {
  const resultHighNoise = VisionAcousticFusionEngine.evaluateFusion({
    audioTranscript: '86 Halibut',
    audioRms: 4500, // Very loud exhaust / sizzle noise
    audioConfidence: 0.70,
    visualDetections: [],
    stationId: 'Grill',
  });

  assert.equal(resultHighNoise.alpha, 0.25);
  assert.equal(resultHighNoise.beta, 0.75);
});
