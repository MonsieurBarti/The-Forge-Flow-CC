#!/usr/bin/env bun
/**
 * Post-build script that prepends the CLI shebang to dist/cli/index.js
 * This is needed because tsc doesn't support adding shebangs.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const cliPath = resolve(import.meta.dirname, "../dist/cli/index.js");

if (!existsSync(cliPath)) {
	console.error("CLI file not found:", cliPath);
	process.exit(1);
}

const content = readFileSync(cliPath, "utf-8");

// Only add shebang if not already present
if (!content.startsWith("#!/usr/bin/env node")) {
	writeFileSync(cliPath, `#!/usr/bin/env node\n${content}`);
	console.log("Added shebang to dist/cli/index.js");
} else {
	console.log("Shebang already present in dist/cli/index.js");
}
