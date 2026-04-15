export function tffWarn(message: string, context?: Record<string, unknown>): void {
	if (context !== undefined) {
		console.warn("[tff]", message, context);
	} else {
		console.warn("[tff]", message);
	}
}
