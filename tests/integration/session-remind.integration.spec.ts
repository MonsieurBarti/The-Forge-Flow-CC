import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as generateReminderModule from "../../src/application/session/generate-reminder.js";
import { sessionRemindCmd } from "../../src/cli/commands/session-remind.cmd.js";
import type { DependencyStore } from "../../src/domain/ports/dependency-store.port.js";
import type { SessionStore } from "../../src/domain/ports/session-store.port.js";
import type { TaskStore } from "../../src/domain/ports/task-store.port.js";
import type { StateStores } from "../../src/infrastructure/adapters/sqlite/create-state-stores.js";
import { createStateStores } from "../../src/infrastructure/adapters/sqlite/create-state-stores.js";

vi.mock("node:fs");
vi.mock("../../src/infrastructure/adapters/sqlite/create-state-stores.js");
vi.mock("../../src/application/session/generate-reminder.js");

describe("session-remind integration", () => {
	const testDir = "/test/project";

	beforeEach(() => {
		vi.resetAllMocks();
		vi.stubGlobal("process", { ...process, cwd: () => testDir });
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("returns null when no active session exists", async () => {
		// Setup initialized project without session
		vi.mocked(existsSync).mockImplementation((p) => {
			if (p === path.join(testDir, ".tff")) return true;
			if (p === path.join(testDir, ".tff", "settings.yaml")) return false;
			return false;
		});

		const mockStores: StateStores = {
			db: { init: vi.fn() },
			projectStore: { getProject: vi.fn(), saveProject: vi.fn() },
			milestoneStore: {
				createMilestone: vi.fn(),
				getMilestone: vi.fn(),
				listMilestones: vi.fn(),
				updateMilestone: vi.fn(),
				closeMilestone: vi.fn(),
			},
			sliceStore: {
				createSlice: vi.fn(),
				getSlice: vi.fn(),
				listSlices: vi.fn(),
				updateSlice: vi.fn(),
				transitionSlice: vi.fn(),
			},
			taskStore: {
				createTask: vi.fn(),
				getTask: vi.fn(),
				listTasks: vi.fn(),
				updateTask: vi.fn(),
				claimTask: vi.fn(),
				closeTask: vi.fn(),
				listReadyTasks: vi.fn(),
				listStaleClaims: vi.fn(),
				getExecutorsForSlice: vi.fn(),
			} as TaskStore,
			dependencyStore: {
				addDependency: vi.fn(),
				removeDependency: vi.fn(),
				getDependencies: vi.fn(),
			} as DependencyStore,
			sessionStore: {
				getSession: vi.fn().mockReturnValue(null),
				saveSession: vi.fn(),
			} as SessionStore,
			reviewStore: {
				recordReview: vi.fn(),
				getLatestReview: vi.fn(),
				listReviews: vi.fn(),
			},
			journalRepository: {
				append: vi.fn(),
				readAll: vi.fn(),
				readSince: vi.fn(),
				count: vi.fn(),
			},
		};
		vi.mocked(createStateStores).mockReturnValue(mockStores);
		vi.mocked(generateReminderModule.generateReminder).mockReturnValue(null);

		const result = await sessionRemindCmd([]);
		const parsed = JSON.parse(result);

		expect(parsed.ok).toBe(true);
		expect(parsed.data.reminder).toBeNull();
	});

	it("returns formatted reminder when session is active", async () => {
		// Setup project with active session and reminders enabled
		vi.mocked(existsSync).mockImplementation((p) => {
			if (p === path.join(testDir, ".tff")) return true;
			if (p === path.join(testDir, ".tff", "settings.yaml")) return true;
			return false;
		});
		vi.mocked(readFileSync).mockReturnValue("workflow:\n  reminders: true");

		const mockSession = {
			milestoneId: "M001",
			sliceId: "S01",
			phase: "executing",
			wave: 2,
			totalWaves: 3,
		};
		const mockStores: StateStores = {
			db: { init: vi.fn() },
			projectStore: { getProject: vi.fn(), saveProject: vi.fn() },
			milestoneStore: {
				createMilestone: vi.fn(),
				getMilestone: vi.fn(),
				listMilestones: vi.fn(),
				updateMilestone: vi.fn(),
				closeMilestone: vi.fn(),
			},
			sliceStore: {
				createSlice: vi.fn(),
				getSlice: vi.fn(),
				listSlices: vi.fn(),
				updateSlice: vi.fn(),
				transitionSlice: vi.fn(),
			},
			taskStore: {
				createTask: vi.fn(),
				getTask: vi.fn(),
				listTasks: vi.fn().mockReturnValue([]),
				updateTask: vi.fn(),
				claimTask: vi.fn(),
				closeTask: vi.fn(),
				listReadyTasks: vi.fn(),
				listStaleClaims: vi.fn(),
				getExecutorsForSlice: vi.fn(),
			} as TaskStore,
			dependencyStore: {
				addDependency: vi.fn(),
				removeDependency: vi.fn(),
				getDependencies: vi.fn().mockReturnValue([]),
			} as DependencyStore,
			sessionStore: {
				getSession: vi.fn().mockReturnValue(mockSession),
				saveSession: vi.fn(),
			} as SessionStore,
			reviewStore: {
				recordReview: vi.fn(),
				getLatestReview: vi.fn(),
				listReviews: vi.fn(),
			},
			journalRepository: {
				append: vi.fn(),
				readAll: vi.fn(),
				readSince: vi.fn(),
				count: vi.fn(),
			},
		};
		vi.mocked(createStateStores).mockReturnValue(mockStores);
		vi.mocked(generateReminderModule.generateReminder).mockReturnValue(
			"```\nM001-S01: executing | Wave 2/3 | Next: /tff:execute or /tff:pause\n```",
		);

		const result = await sessionRemindCmd([]);
		const parsed = JSON.parse(result);

		expect(parsed.ok).toBe(true);
		expect(parsed.data.reminder).not.toBeNull();
		expect(parsed.data.reminder).toContain("M001");
		expect(parsed.data.reminder).toContain("S01");
		expect(parsed.data.reminder).toContain("executing");
		expect(parsed.data.reminder).toContain("Wave 2/3");
	});

	it("returns null when reminders are disabled in settings", async () => {
		// Setup project with reminders disabled
		vi.mocked(existsSync).mockImplementation((p) => {
			if (p === path.join(testDir, ".tff")) return true;
			if (p === path.join(testDir, ".tff", "settings.yaml")) return true;
			return false;
		});
		vi.mocked(readFileSync).mockReturnValue("workflow:\n  reminders: false");

		const result = await sessionRemindCmd([]);
		const parsed = JSON.parse(result);

		expect(parsed.ok).toBe(true);
		expect(parsed.data.reminder).toBeNull();
		// Should not attempt to create state stores when disabled
		expect(createStateStores).not.toHaveBeenCalled();
	});

	it("handles project without workflow.reminders setting (defaults enabled)", async () => {
		// Setup project without workflow section
		vi.mocked(existsSync).mockImplementation((p) => {
			if (p === path.join(testDir, ".tff")) return true;
			if (p === path.join(testDir, ".tff", "settings.yaml")) return true;
			return false;
		});
		vi.mocked(readFileSync).mockReturnValue("model-profiles:\n  quality:\n    model: sonnet");

		const mockSession = {
			milestoneId: "M003",
			sliceId: "S01",
			phase: "reviewing",
			wave: 3,
			totalWaves: 4,
		};
		const mockStores: StateStores = {
			db: { init: vi.fn() },
			projectStore: { getProject: vi.fn(), saveProject: vi.fn() },
			milestoneStore: {
				createMilestone: vi.fn(),
				getMilestone: vi.fn(),
				listMilestones: vi.fn(),
				updateMilestone: vi.fn(),
				closeMilestone: vi.fn(),
			},
			sliceStore: {
				createSlice: vi.fn(),
				getSlice: vi.fn(),
				listSlices: vi.fn(),
				updateSlice: vi.fn(),
				transitionSlice: vi.fn(),
			},
			taskStore: {
				createTask: vi.fn(),
				getTask: vi.fn(),
				listTasks: vi.fn().mockReturnValue([]),
				updateTask: vi.fn(),
				claimTask: vi.fn(),
				closeTask: vi.fn(),
				listReadyTasks: vi.fn(),
				listStaleClaims: vi.fn(),
				getExecutorsForSlice: vi.fn(),
			} as TaskStore,
			dependencyStore: {
				addDependency: vi.fn(),
				removeDependency: vi.fn(),
				getDependencies: vi.fn().mockReturnValue([]),
			} as DependencyStore,
			sessionStore: {
				getSession: vi.fn().mockReturnValue(mockSession),
				saveSession: vi.fn(),
			} as SessionStore,
			reviewStore: {
				recordReview: vi.fn(),
				getLatestReview: vi.fn(),
				listReviews: vi.fn(),
			},
			journalRepository: {
				append: vi.fn(),
				readAll: vi.fn(),
				readSince: vi.fn(),
				count: vi.fn(),
			},
		};
		vi.mocked(createStateStores).mockReturnValue(mockStores);
		vi.mocked(generateReminderModule.generateReminder).mockReturnValue(
			"```\nM003-S01: reviewing | Wave 3/4\n```",
		);

		const result = await sessionRemindCmd([]);
		const parsed = JSON.parse(result);

		expect(parsed.ok).toBe(true);
		expect(parsed.data.reminder).not.toBeNull();
		expect(parsed.data.reminder).toContain("M003");
	});
});
