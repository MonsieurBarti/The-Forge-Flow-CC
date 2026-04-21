import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");
const WHITELIST = `${REPO}/tests/whitelists/sqlite-raw-callsites.txt`;

describe("raw better-sqlite3 call-site whitelist", () => {
	it("every `.run/.exec/.prepare(` in src/ is in the whitelist", () => {
		const raw = execSync(`grep -rnE "\\.(run|exec|prepare)\\(" src/ --include="*.ts" || true`, {
			cwd: REPO,
			encoding: "utf8",
		});
		const matches = raw
			.split("\n")
			.filter(Boolean)
			.map((line) => {
				const [path, lineNum] = line.split(":");
				return `${path}:${lineNum}`;
			});

		const listed = readFileSync(WHITELIST, "utf8")
			.split("\n")
			.map((l) => l.trim())
			.filter((l) => l && !l.startsWith("#"));

		const unlisted = matches.filter((m) => !listed.includes(m));
		if (unlisted.length > 0) {
			throw new Error(
				`Found ${unlisted.length} unlisted raw SQL call site(s):\n` +
					unlisted.map((m) => `  - ${m}`).join("\n") +
					`\n\nAdd them to ${WHITELIST} (each entry must be justified during review).`,
			);
		}
		expect(unlisted).toEqual([]);

		const stale = listed.filter((l) => !matches.includes(l));
		expect(stale).toEqual([]); // whitelist entries must still point to real call sites
	});
});
