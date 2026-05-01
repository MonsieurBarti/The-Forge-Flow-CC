import { describe, expect, it, vi } from "vitest";
import {
	loadProjectSettings,
	ProjectSettingsSchema,
	parseProjectSettings,
} from "../../../../src/domain/value-objects/project-settings.js";

describe("ProjectSettingsSchema", () => {
	it("should parse a complete valid settings object", () => {
		const input = {
			"model-profiles": {
				quality: { model: "opus" },
				balanced: { model: "sonnet" },
				budget: { model: "sonnet" },
			},
			autonomy: { mode: "plan-to-pr" },
		};
		const result = ProjectSettingsSchema.safeParse(input);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.autonomy.mode).toBe("plan-to-pr");
		}
	});

	it("should reject invalid autonomy mode at schema level", () => {
		const input = { autonomy: { mode: "yolo" } };
		const result = ProjectSettingsSchema.safeParse(input);
		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data.autonomy.mode).toBe("guided");
		}
	});
});

describe("parseProjectSettings", () => {
	it("should return all defaults for undefined input", () => {
		const settings = parseProjectSettings(undefined);
		expect(settings.autonomy.mode).toBe("guided");
		expect(settings["model-profiles"].quality.model).toBe("opus");
		expect(settings["model-profiles"].balanced.model).toBe("sonnet");
		expect(settings["model-profiles"].budget.model).toBe("sonnet");
		expect(settings.workflow.reminders).toBe(true);
		expect(settings.workflow.guards).toBe(true);
	});

	it("should return all defaults for null input", () => {
		const settings = parseProjectSettings(null);
		expect(settings.autonomy.mode).toBe("guided");
	});

	it("should return all defaults for empty string input", () => {
		const settings = parseProjectSettings("");
		expect(settings.autonomy.mode).toBe("guided");
	});

	it("should return all defaults for non-object input", () => {
		const settings = parseProjectSettings(42);
		expect(settings.autonomy.mode).toBe("guided");
	});

	it("should fill missing sections with defaults", () => {
		const settings = parseProjectSettings({ autonomy: { mode: "plan-to-pr" } });
		expect(settings.autonomy.mode).toBe("plan-to-pr");
		expect(settings["model-profiles"].quality.model).toBe("opus");
	});

	it("should fall back invalid fields to defaults while preserving valid siblings", () => {
		const settings = parseProjectSettings({
			autonomy: { mode: "invalid-mode" },
			"model-profiles": {
				quality: { model: "haiku" },
				balanced: { model: "sonnet" },
				budget: { model: "sonnet" },
			},
		});
		expect(settings.autonomy.mode).toBe("guided");
		expect(settings["model-profiles"].quality.model).toBe("haiku");
	});

	it("should preserve unknown top-level sections (e.g. routing) via passthrough", () => {
		const settings = parseProjectSettings({
			routing: { enabled: true, confidence_threshold: 0.7 },
		}) as unknown as { routing?: { enabled: boolean; confidence_threshold: number } };
		expect(settings.routing?.enabled).toBe(true);
		expect(settings.routing?.confidence_threshold).toBe(0.7);
	});
});

describe("loadProjectSettings", () => {
	it("should return defaults for corrupted YAML", () => {
		const settings = loadProjectSettings('{ broken: yaml: [["');
		expect(settings.autonomy.mode).toBe("guided");
		expect(settings["model-profiles"].quality.model).toBe("opus");
	});

	it("should log a warning for corrupted YAML", () => {
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
		loadProjectSettings('{ broken: yaml: [["');
		expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("[tff]"), expect.any(String));
		warnSpy.mockRestore();
	});

	it("should parse valid YAML and return settings", () => {
		const yaml = "autonomy:\n  mode: plan-to-pr\n";
		const settings = loadProjectSettings(yaml);
		expect(settings.autonomy.mode).toBe("plan-to-pr");
		expect(settings["model-profiles"].quality.model).toBe("opus");
	});

	it("should return defaults for empty file content", () => {
		const settings = loadProjectSettings("");
		expect(settings.autonomy.mode).toBe("guided");
	});
});
