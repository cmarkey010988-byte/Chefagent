import test from 'node:test';
import assert from 'node:assert/strict';
import { P2PTlsSecurityManager } from './P2PTlsSecurityManager';

test('Cleartext local subnet validator permits 192.168.x.x, 10.x.x.x, and localhost', () => {
  assert.equal(P2PTlsSecurityManager.isCleartextPermitted('localhost'), true);
  assert.equal(P2PTlsSecurityManager.isCleartextPermitted('127.0.0.1'), true);
  assert.equal(P2PTlsSecurityManager.isCleartextPermitted('192.168.1.104'), true);
  assert.equal(P2PTlsSecurityManager.isCleartextPermitted('10.0.1.5'), true);
  assert.equal(P2PTlsSecurityManager.isCleartextPermitted('http://192.168.1.108:8888'), true);

  // Reject public internet cleartext
  assert.equal(P2PTlsSecurityManager.isCleartextPermitted('api.chefagent.com'), false);
  assert.equal(P2PTlsSecurityManager.isCleartextPermitted('8.8.8.8'), false);
});

test('Certificate pin verifier authenticates valid SHA-256 public key hash and rejects invalid pins', () => {
  const validPin = 'a8s9df7a8sdf9a7sd8f9a7sdf98a7sdf98a7sdf98a7=';
  const invalidPin = 'invalid_fake_pin_hash_123=';

  assert.equal(P2PTlsSecurityManager.verifyCertificatePin('api.chefagent.com', validPin), true);
  assert.equal(P2PTlsSecurityManager.verifyCertificatePin('api.chefagent.com', invalidPin), false);
});
