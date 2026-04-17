#!/bin/sh
# Fail if any .tff/ path reference exists outside the migration whitelist.
# Whitelist:
#   - migration.ts (migrates FROM legacy)
#   - migration.spec.ts (tests it)
#   - path-contract.spec.ts (tests that .tff/ does NOT exist — must mention it)

set -e

# grep -rn output format is `path:line:content`, so anchoring whitelist entries
# with a trailing `:` prevents substring collisions (e.g., a file named
# `migration.ts.bak` would otherwise be whitelisted by `migration\.ts`).
MATCHES=$(grep -rnE '\.tff/' \
  --include='*.ts' --include='*.js' --include='*.sh' \
  --include='*.md' --include='*.yaml' --include='*.yml' \
  --include='*.json' \
  src/ hooks/ workflows/ commands/ skills/ references/ tests/ \
  2>/dev/null \
  | grep -v 'src/infrastructure/migration\.ts:' \
  | grep -v 'tests/unit/infrastructure/migration\.spec\.ts:' \
  | grep -v 'tests/integration/path-contract\.spec\.ts:' \
  | grep -v '\.original\.md:' \
  || true)

if [ -n "$MATCHES" ]; then
  echo "Found legacy .tff/ references outside whitelist:"
  echo "$MATCHES"
  exit 1
fi
exit 0
