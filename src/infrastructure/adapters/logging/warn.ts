export function tffWarn(message: string, context?: Record<string, unknown>): void {
	if (context !== undefined) {
		console.warn("[tff]", message, context);
	} else {
		console.warn("[tff]", message);
	}
}

/**
 * Emit a debug-level trace line. Opt-in via `TFF_DEBUG=1`; silent otherwise.
 * Debug output must never mutate public JSON; used for best-effort, non-fatal
 * paths (e.g. reconciler renderer failures on read-only commands) where the
 * caller explicitly does NOT want to surface a PARTIAL_SUCCESS but the signal
 * is still valuable when troubleshooting.
 */
export function tffDebug(message: string, context?: Record<string, unknown>): void {
	if (process.env.TFF_DEBUG !== "1") return;
	if (context !== undefined) {
		console.error("[tff:debug]", message, context);
	} else {
		console.error("[tff:debug]", message);
	}
}
