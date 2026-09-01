/**
 * Fixed user id for local/demo runs before auth is wired up. The orchestrator and API
 * routes use this so the pipeline is testable end to end without a login flow yet.
 * Replace with the authenticated user's id once auth ships - see BRIEF.md status.
 */
export const DEMO_USER_ID = "e6e95095-4c8a-47db-ac92-3b3352f59358";
