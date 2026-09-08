// Shared operational bounds for model calls.
//
// The SDK's defaults are a ten minute timeout and two internal retries, which
// is far too generous for a request that sits in front of an operator run or a
// user waiting on a draft. These are the one place those bounds are set, so
// every model call in the product fails fast and falls back deterministically
// instead of holding a worker open.
//
// This is not billing-grade AI accounting. It is a latency and cost ceiling.

/** Hard wall-clock ceiling for a single model request. */
export const AI_REQUEST_TIMEOUT_MS = 60_000;

/**
 * Internal SDK retries. One retry absorbs a genuine transient 5xx or 429
 * without turning a model outage into a repeated-call loop; every caller
 * already has a deterministic fallback for the failure case.
 */
export const AI_MAX_RETRIES = 1;
