const NODE_TLS_KEY = 'node_tls_reject_unauthorized';
const NPM_STRICT_SSL_KEY = 'npm_config_strict_ssl';

/**
 * Build an environment for repo-controlled network child processes.
 *
 * The parent Codex/shell process may have inherited a TLS bypass that this
 * repository cannot permanently remove. Child processes must not inherit it.
 */
export function secureTlsEnvironment(source = process.env) {
  const environment = {};

  for (const [key, value] of Object.entries(source)) {
    const normalized = key.toLowerCase();
    if (normalized === NODE_TLS_KEY || normalized === NPM_STRICT_SSL_KEY) continue;
    environment[key] = value;
  }

  environment.npm_config_strict_ssl = 'true';
  return environment;
}

export function insecureTlsReasons(source = process.env) {
  const reasons = [];

  for (const [key, value] of Object.entries(source)) {
    const normalized = key.toLowerCase();
    if (normalized === NODE_TLS_KEY && value === '0') {
      reasons.push(`${key}=0`);
    }
    if (normalized === NPM_STRICT_SSL_KEY && String(value).toLowerCase() === 'false') {
      reasons.push(`${key}=false`);
    }
  }

  return reasons;
}
