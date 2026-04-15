/**
 * Test setup file for TFF-CC.
 * Scrubs GIT_* environment variables to prevent ghost staging
 * during test execution.
 */

// Scrub GIT_* environment variables to prevent ghost staging
for (const key of Object.keys(process.env)) {
  if (key.startsWith('GIT_')) {
    delete process.env[key];
  }
}
