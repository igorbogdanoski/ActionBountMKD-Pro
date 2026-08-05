import test from 'node:test';
import assert from 'node:assert/strict';
import { insecureTlsReasons, secureTlsEnvironment } from './secure-tls-env.mjs';

test('removes Node TLS bypass variants and enforces npm strict SSL', () => {
  const secured = secureTlsEnvironment({
    PATH: 'test-path',
    NODE_TLS_REJECT_UNAUTHORIZED: '0',
    Node_Tls_Reject_Unauthorized: '0',
    NPM_CONFIG_STRICT_SSL: 'false',
  });

  assert.equal(secured.PATH, 'test-path');
  assert.equal(secured.NODE_TLS_REJECT_UNAUTHORIZED, undefined);
  assert.equal(secured.Node_Tls_Reject_Unauthorized, undefined);
  assert.equal(secured.NPM_CONFIG_STRICT_SSL, undefined);
  assert.equal(secured.npm_config_strict_ssl, 'true');
});

test('reports insecure TLS settings without flagging secure values', () => {
  assert.deepEqual(
    insecureTlsReasons({ NODE_TLS_REJECT_UNAUTHORIZED: '0', npm_config_strict_ssl: 'false' }),
    ['NODE_TLS_REJECT_UNAUTHORIZED=0', 'npm_config_strict_ssl=false'],
  );
  assert.deepEqual(
    insecureTlsReasons({ NODE_TLS_REJECT_UNAUTHORIZED: '1', npm_config_strict_ssl: 'true' }),
    [],
  );
});
