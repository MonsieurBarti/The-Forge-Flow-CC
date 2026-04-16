import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { mkdtempSync, rmSync } from "node:fs";
import path from "node:path";

describe("CLI --help flag", () => {
	let tmpDir: string;

	beforeEach(() => {
		tmpDir = mkdtempSync(path.join(tmpdir(), "tff-cli-help-test-"));
	});

	afterEach(() => {
		rmSync(tmpDir, { recursive: true, force: true });
	});

	it("shows help for slice:transition command", async () => {
		const result = await runCli(["slice:transition", "--help"]);
		expect(result.exitCode).toBe(0);
		const output = JSON.parse(result.stdout);
		expect(output.ok).toBe(true);
		expect(output.data.name).toBe("slice:transition");
		expect(output.data.purpose).toContain("Transition");
		expect(output.data.requiredFlags).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ name: "--slice-id" }),
				expect.objectContaining({ name: "--status" }),
			]),
		);
		expect(output.data.examples).toBeDefined();
	});

	it("shows help for checkpoint:save command", async () => {
		const result = await runCli(["checkpoint:save", "--help"]);
		expect(result.exitCode).toBe(0);
		const output = JSON.parse(result.stdout);
		expect(output.ok).toBe(true);
		expect(output.data.name).toBe("checkpoint:save");
		expect(output.data.requiredFlags).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ name: "--slice-id" }),
				expect.objectContaining({ name: "--base-commit" }),
			]),
		);
	});

	it("shows error for unknown command with --help", async () => {
		const result = await runCli(["unknown:command", "--help"]);
		expect(result.exitCode).toBe(0);
		const output = JSON.parse(result.stdout);
		expect(output.ok).toBe(false);
		expect(output.error.code).toBe("UNKNOWN_COMMAND");
	});
});

describe("CLI schema command", () => {
	it("returns JSON Schema for slice:transition", async () => {
		const result = await runCli(["schema", "--command", "slice:transition"]);
		expect(result.exitCode).toBe(0);
		const output = JSON.parse(result.stdout);
		expect(output.ok).toBe(true);
		expect(output.data.command).toBe("slice:transition");
		expect(output.data.flags.type).toBe("object");
		expect(output.data.flags.required).toContain("slice-id");
		expect(output.data.flags.required).toContain("status");
	});

	it("returns JSON Schema for checkpoint:save", async () => {
		const result = await runCli(["schema", "--command", "checkpoint:save"]);
		expect(result.exitCode).toBe(0);
		const output = JSON.parse(result.stdout);
		expect(output.ok).toBe(true);
		expect(output.data.command).toBe("checkpoint:save");
		expect(output.data.flags.properties["slice-id"]).toBeDefined();
		expect(output.data.flags.properties["base-commit"]).toBeDefined();
	});

	it("returns error for unknown command", async () => {
		const result = await runCli(["schema", "--command", "unknown:command"]);
		expect(result.exitCode).toBe(0);
		const output = JSON.parse(result.stdout);
		expect(output.ok).toBe(false);
		expect(output.error.code).toBe("UNKNOWN_COMMAND");
	});
});

function runCli(args: string[]): Promise<{ stdout: string; exitCode: number }> {
	return new Promise((resolve) => {
		const cliPath = path.join(process.cwd(), "dist", "cli", "index.js");
		const child = spawn("node", [cliPath, ...args], {
			cwd: process.cwd(),
			stdio: ["pipe", "pipe", "pipe"],
		});

		let stdout = "";
		child.stdout.on("data", (data) => {
			stdout += data.toString();
		});

		child.on("close", (code) => {
			resolve({ stdout, exitCode: code ?? 0 });
		});
	});
}
