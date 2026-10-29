/**
 * src/services/security/AuthInterceptor.test.ts
 *
 * Unit tests for Role-Based Access Control (RBAC) authorization checks and zero-trust policies.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { AuthInterceptor } from './AuthInterceptor';

test('RBAC role evaluation and executive gating', () => {
  // Default session is corporate executive
  assert.equal(AuthInterceptor.hasExecutiveAccess(), true);
  assert.equal(AuthInterceptor.isCorporateExecutive(), true);
  assert.equal(AuthInterceptor.canModifyFinancialLedger(), true);
  assert.equal(AuthInterceptor.canExecuteAdminPinOverride(), true);
  assert.equal(AuthInterceptor.shouldRenderExecutiveNavigation(), true);

  // Switch session to line cook
  AuthInterceptor.setSession({
    userId: 'cook-99',
    fullName: 'Line Cook Dave',
    propertyId: 'PROP-01',
    role: 'ROLE_LINE_COOK',
    token: 'line-cook-token',
  });

  assert.equal(AuthInterceptor.hasExecutiveAccess(), false);
  assert.equal(AuthInterceptor.isCorporateExecutive(), false);
  assert.equal(AuthInterceptor.canModifyFinancialLedger(), false);
  assert.equal(AuthInterceptor.canExecuteAdminPinOverride(), false);
  assert.equal(AuthInterceptor.shouldRenderExecutiveNavigation(), false);

  const headers = AuthInterceptor.injectAuthHeaders({}) as Record<string, string>;
  assert.equal(headers['X-User-Role'], 'ROLE_LINE_COOK');
  assert.equal(headers['Authorization'], 'Bearer line-cook-token');

  // Switch session to head chef
  AuthInterceptor.setSession({
    userId: 'chef-01',
    fullName: 'Executive Chef Bruce',
    propertyId: 'PROP-01',
    role: 'ROLE_HEAD_CHEF',
    token: 'head-chef-token',
  });

  assert.equal(AuthInterceptor.hasExecutiveAccess(), false);
  assert.equal(AuthInterceptor.isCorporateExecutive(), false);
  assert.equal(AuthInterceptor.canModifyFinancialLedger(), false);
  assert.equal(AuthInterceptor.canExecuteAdminPinOverride(), false);

  // Switch session to general manager
  AuthInterceptor.setSession({
    userId: 'gm-01',
    fullName: 'GM Susan Vance',
    propertyId: 'PROP-01',
    role: 'ROLE_GENERAL_MANAGER',
    token: 'gm-token',
  });

  assert.equal(AuthInterceptor.hasExecutiveAccess(), true);
  assert.equal(AuthInterceptor.isCorporateExecutive(), false);
  assert.equal(AuthInterceptor.canModifyFinancialLedger(), true);
  assert.equal(AuthInterceptor.canExecuteAdminPinOverride(), true);
  assert.equal(AuthInterceptor.shouldRenderExecutiveNavigation(), true);

  // Reset to corporate executive for other tests
  AuthInterceptor.setSession({
    userId: 'exec-001',
    fullName: 'Victoria Sterling',
    propertyId: 'PROP-ALL-REGIONAL',
    role: 'ROLE_CORPORATE_EXECUTIVE',
    token: 'chefagent-exec-secure-token-2026-xyz',
  });
});
