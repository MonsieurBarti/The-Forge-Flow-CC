#!/usr/bin/env node
/**
 * Post-build script that prepends the CLI shebang to dist/cli/index.js
 * This is needed because tsc doesn't support adding shebangs.
 * 
 * Used by postinstall to ensure CLI works after npm install.
 */

const fs = require('node:fs');
const path = require('node:path');

const cliPath = path.resolve(__dirname, '../dist/cli/index.js');

if (!fs.existsSync(cliPath)) {
	console.error('CLI file not found:', cliPath);
	process.exit(1);
}

const content = fs.readFileSync(cliPath, 'utf-8');

// Only add shebang if not already present
if (!content.startsWith('#!/usr/bin/env node')) {
	fs.writeFileSync(cliPath, `#!/usr/bin/env node\n${content}`);
	console.log('Added shebang to dist/cli/index.js');
} else {
	console.log('Shebang already present in dist/cli/index.js');
}
