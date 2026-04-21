import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("tffWarn", () => {
	beforeEach(() => {
		vi.spyOn(console, "warn").mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("emits message without context", async () => {
		const { tffWarn } = await import("../../../../src/infrastructure/adapters/logging/warn.js");
		tffWarn("hello");
		expect(console.warn).toHaveBeenCalledWith("[tff]", "hello");
	});

	it("emits message with context object", async () => {
		const { tffWarn } = await import("../../../../src/infrastructure/adapters/logging/warn.js");
		const ctx = { key: "value" };
		tffWarn("hello", ctx);
		expect(console.warn).toHaveBeenCalledWith("[tff]", "hello", ctx);
	});
});

describe("tffDebug", () => {
	beforeEach(() => {
		vi.spyOn(console, "error").mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
		delete process.env.TFF_DEBUG;
	});

	it("is silent when TFF_DEBUG is not set", async () => {
		delete process.env.TFF_DEBUG;
		const { tffDebug } = await import("../../../../src/infrastructure/adapters/logging/warn.js");
		tffDebug("silent");
		expect(console.error).not.toHaveBeenCalled();
	});

	it("emits message without context when TFF_DEBUG=1", async () => {
		process.env.TFF_DEBUG = "1";
		const { tffDebug } = await import("../../../../src/infrastructure/adapters/logging/warn.js");
		tffDebug("debug-msg");
		expect(console.error).toHaveBeenCalledWith("[tff:debug]", "debug-msg");
	});

	it("emits message with context when TFF_DEBUG=1", async () => {
		process.env.TFF_DEBUG = "1";
		const { tffDebug } = await import("../../../../src/infrastructure/adapters/logging/warn.js");
		const ctx = { extra: 42 };
		tffDebug("debug-msg", ctx);
		expect(console.error).toHaveBeenCalledWith("[tff:debug]", "debug-msg", ctx);
	});
});
