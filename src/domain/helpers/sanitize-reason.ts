/**
 * Strip ASCII control characters (including newlines, tabs, DEL) and trim.
 * Returns undefined for undefined input or a result that is all whitespace.
 */
export const sanitizeReason = (input: string | undefined): string | undefined => {
	if (input === undefined) return undefined;
	// biome-ignore lint/suspicious/noControlCharactersInRegex: intentional — this regex IS the control-char filter
	const stripped = input.replace(/[\x00-\x1F\x7F]/g, " ").trim();
	return stripped.length === 0 ? undefined : stripped;
};
