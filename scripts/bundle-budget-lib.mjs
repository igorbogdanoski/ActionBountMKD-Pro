export function collectInitialAssetPaths(html) {
  return [...html.matchAll(/(?:src|href)="\/(assets\/[^"?]+\.(?:js|css))"/g)]
    .map(match => match[1]);
}

export function evaluateBudgetRows(rows) {
  return rows.map(row => ({
    ...row,
    passed: row.actualBytes <= row.limitKiB * 1024,
  }));
}

export function formatKiB(bytes) {
  return (bytes / 1024).toFixed(2);
}
