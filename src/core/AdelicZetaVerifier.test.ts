/**
 * src/core/AdelicZetaVerifier.test.ts
 *
 * Self-executing unit test suite for AdelicZetaVerifier covering ledger equilibrium invariant checks,
 * epsilon tolerance bounds, zeta invariant violation errors, and FCP boundary enforcement.
 */

import { AdelicZetaVerifier, LedgerEntry, ZetaInvariantViolationError } from './AdelicZetaVerifier';

function runTests() {
  console.log('Running AdelicZeta Formal Verification Unit Tests...');

  // 1. Balanced Ledger Equilibrium Test
  const balancedEntries: LedgerEntry[] = [
    { id: 'TX-101', propertyId: 'PROP-01', accountCode: '1000', debitCents: 5000, creditCents: 0 },
    { id: 'TX-102', propertyId: 'PROP-01', accountCode: '2000', debitCents: 0, creditCents: 5000 },
  ];
  const balancedResult = AdelicZetaVerifier.verifyLedgerEquilibrium(balancedEntries);
  if (balancedResult !== true) {
    throw new Error('Balanced ledger equilibrium should succeed');
  }
  console.log('✓ Balanced ledger equilibrium test passed.');

  // 2. Unbalanced Ledger Equilibrium Invariant Breach Test
  const unbalancedEntries: LedgerEntry[] = [
    { id: 'TX-101', propertyId: 'PROP-01', accountCode: '1000', debitCents: 5001, creditCents: 0 },
    { id: 'TX-102', propertyId: 'PROP-01', accountCode: '2000', debitCents: 0, creditCents: 5000 },
  ];
  let caughtViolation = false;
  try {
    AdelicZetaVerifier.verifyLedgerEquilibrium(unbalancedEntries);
  } catch (err) {
    if (err instanceof ZetaInvariantViolationError) {
      caughtViolation = true;
    }
  }
  if (!caughtViolation) {
    throw new Error('Unbalanced ledger must throw ZetaInvariantViolationError');
  }
  console.log('✓ Invariant breach test passed (unbalanced ledger correctly quarantined).');

  // 3. FCP Boundary Constraint Test (Valid)
  const fcpValid = AdelicZetaVerifier.verifyFcpBoundary('PROP-01', 27.5, 28.0);
  if (!fcpValid.isValid) {
    throw new Error('FCP at 27.5% should be valid');
  }
  console.log('✓ FCP boundary standard compliance test passed.');

  // 4. FCP Boundary Constraint Test (Exceeded without override)
  let caughtFcpViolation = false;
  try {
    AdelicZetaVerifier.verifyFcpBoundary('PROP-03', 32.8, 28.0);
  } catch (err) {
    if (err instanceof ZetaInvariantViolationError) {
      caughtFcpViolation = true;
    }
  }
  if (!caughtFcpViolation) {
    throw new Error('FCP exceeding 28.0% without override must throw ZetaInvariantViolationError');
  }
  console.log('✓ FCP boundary threshold violation test passed.');

  // 5. FCP Boundary Constraint Test (Exceeded with valid override token)
  const fcpOverride = AdelicZetaVerifier.verifyFcpBoundary('PROP-03', 32.8, 28.0, 'OVERRIDE-EXEC-APPROVED-99');
  if (!fcpOverride.isValid || !fcpOverride.warning) {
    throw new Error('FCP exceeding 28.0% with executive override token must succeed');
  }
  console.log('✓ Executive variance override token test passed.');

  console.log('All AdelicZeta Formal Invariant Tests PASSED successfully.');
}

runTests();
