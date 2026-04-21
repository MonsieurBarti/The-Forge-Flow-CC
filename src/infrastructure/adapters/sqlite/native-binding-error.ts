// src/infrastructure/adapters/sqlite/native-binding-error.ts

export interface NativeBindingCandidateFailure {
	path: string;
	source: "prebuilt" | "local";
	reason: string;
}

export interface NativeBindingErrorDetails {
	platform: string;
	arch: string;
	nodeAbi: string;
	candidates: NativeBindingCandidateFailure[];
	remediation: string;
}

const REMEDIATION = "reinstall better-sqlite3: bun install --force better-sqlite3";

const renderMessage = (d: Omit<NativeBindingErrorDetails, "remediation">): string => {
	const header = `failed to load better-sqlite3 native binding (platform=${d.platform} arch=${d.arch} node-abi=${d.nodeAbi})`;
	const attempts = d.candidates.length
		? d.candidates.map((c) => `  - [${c.source}] ${c.path}: ${c.reason}`).join("\n")
		: "  - (no candidates found on disk)";
	return `${header}\n${attempts}\nremediation: ${REMEDIATION}`;
};

export class NativeBindingError extends Error {
	readonly code = "NATIVE_BINDING_FAILED" as const;
	readonly details: NativeBindingErrorDetails;

	constructor(input: Omit<NativeBindingErrorDetails, "remediation">) {
		const details: NativeBindingErrorDetails = { ...input, remediation: REMEDIATION };
		super(renderMessage(input));
		this.name = "NativeBindingError";
		this.details = details;
		Object.setPrototypeOf(this, NativeBindingError.prototype);
	}

	toJSON(): {
		code: "NATIVE_BINDING_FAILED";
		message: string;
		details: NativeBindingErrorDetails;
	} {
		return { code: this.code, message: this.message, details: this.details };
	}
}
