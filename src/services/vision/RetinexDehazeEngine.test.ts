import test from 'node:test';
import assert from 'node:assert/strict';
import { RetinexDehazeEngine } from './RetinexDehazeEngine';

test('RetinexDehazeEngine - computes accurate motion vector deltas between frames', () => {
  const frameA = [100, 100, 100, 100, 100];
  const frameB = [100, 100, 100, 100, 100]; // Identical
  const frameC = [150, 150, 150, 150, 150]; // Motion delta = 50 / 255 = ~0.196

  const deltaZero = RetinexDehazeEngine.computeMotionVectorDelta(frameA, frameB);
  assert.equal(deltaZero, 0.0);

  const deltaMotion = RetinexDehazeEngine.computeMotionVectorDelta(frameA, frameC);
  assert.ok(deltaMotion > 0.18 && deltaMotion < 0.22);
});

test('RetinexDehazeEngine - decimates to 2 FPS when static for >3.0s, restores 30 FPS upon motion', () => {
  // 1. Static for 3500ms with low motion delta (0.01) -> drops to 2 FPS
  const decimated = RetinexDehazeEngine.determineDecimationFps(3500, 0.01, 'ACTIVE_MOTION_30FPS');
  assert.equal(decimated.fps, 2);
  assert.equal(decimated.mode, 'IDLE_DECIMATED_2FPS');
  assert.equal(decimated.shouldDecimate, true);

  // 2. High motion delta (0.15) detected -> immediately ramps to 30 FPS
  const active = RetinexDehazeEngine.determineDecimationFps(0, 0.15, 'IDLE_DECIMATED_2FPS');
  assert.equal(active.fps, 30);
  assert.equal(active.mode, 'ACTIVE_MOTION_30FPS');
  assert.equal(active.shouldDecimate, false);
});

test('RetinexDehazeEngine - applies multi-scale Retinex contrast enhancement to steam-obscured pixels', () => {
  // Low-contrast foggy pixels
  const foggyPixels = [120, 122, 121, 125, 123, 120, 122];
  const enhanced = RetinexDehazeEngine.applyMultiScaleRetinexDehaze(foggyPixels);

  assert.equal(enhanced.length, foggyPixels.length);
  for (const p of enhanced) {
    assert.ok(p >= 0 && p <= 255);
  }
});

test('RetinexDehazeEngine - triggers micro-heater defogger when steam/grease exceeds threshold', () => {
  const trigger = RetinexDehazeEngine.evaluateLensDefogMicroHeaterTrigger(55, 60, 42.0);
  assert.equal(trigger.heaterAction, 'CONTINUOUS_DEFOG');
  assert.equal(trigger.targetTempC, 52.0);

  const standby = RetinexDehazeEngine.evaluateLensDefogMicroHeaterTrigger(5, 5, 25.0);
  assert.equal(standby.heaterAction, 'STANDBY');
});

test('RetinexDehazeEngine - calibrates Gastronorm GN 1/1 pan tare and skew correction', () => {
  const tare = RetinexDehazeEngine.calibrateGastronormTare('GN_1_1', 320, 520);
  assert.equal(tare.standard, 'GN_1_1');
  assert.equal(tare.nominalWidthMm, 325);
  assert.equal(tare.nominalLengthMm, 530);
  assert.equal(tare.isCalibrated, true);
  assert.ok(tare.opticalSkewMatrix[3] > 0);
  assert.equal(tare.tareWeightGrams, 1420);
});
