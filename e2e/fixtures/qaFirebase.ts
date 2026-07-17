// Browser-QA-only inert Firebase handles. The authenticated harness aliases
// this module before the production initializer runs, so lazy route graphs can
// be rendered without credentials while production keeps its real config.
export const auth = {};
export const provider = {};
export const storage = {};
export const db = {};
