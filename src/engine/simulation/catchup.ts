/** Shortest absence (ms) that triggers an offline catch-up. */
export const CATCHUP_MIN_GAP_MS = 600_000
/** Longest absence a catch-up simulates, in tank days; longer gaps are capped. */
export const CATCHUP_MAX_DAYS = 30
/** Most away reports kept in the persisted log. */
export const AWAY_LOG_MAX = 12
