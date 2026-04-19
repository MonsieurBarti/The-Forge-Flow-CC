/**
 * Test setup file for TFF-CC.
 * Scrubs GIT_* environment variables to prevent ghost staging
 * during test execution, and isolates TFF_CC_HOME so tests that
 * transitively call getProjectId()/ensureProjectHomeDir() don't
 * leak empty project skeletons into the user's real ~/.tff-cc/.
 */

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Scrub GIT_* environment variables to prevent ghost staging
for (const key of Object.keys(process.env)) {
	if (key.startsWith("GIT_")) {
		delete process.env[key];
	}
}

// Isolate TFF_CC_HOME to a per-worker tmpdir. Individual tests may still
// override this in their own beforeEach; restoring the original value will
// restore this tmpdir rather than the user's real home, which is the point.
const tffCcHomeTmp = mkdtempSync(join(tmpdir(), "tff-cc-test-home-"));
process.env.TFF_CC_HOME = tffCcHomeTmp;

process.on("exit", () => {
	rmSync(tffCcHomeTmp, { recursive: true, force: true });
});
