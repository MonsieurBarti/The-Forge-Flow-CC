# Release Checklist

Before every release, complete ALL steps in order.

## Pre-Release

- [ ] All tests pass: `cd tools && npx vitest run`
- [ ] Type check passes: `npx tsc --noEmit -p tools/tsconfig.json`
- [ ] Build succeeds: `npm run build`
- [ ] CLI works: `node tools/dist/tff-tools.cjs --help`

## Version Bumps

- [ ] Bump version in `package.json` (`"version": "X.Y.Z"`)
- [ ] Bump version in `.claude-plugin/plugin.json` (`"version": "X.Y.Z"`)
- [ ] Bump version in `plugin/.claude-plugin/plugin.json` (`"version": "X.Y.Z"`)
- [ ] Update `tools/src/cli/index.ts` version string if hardcoded

## Documentation

- [ ] Update `CHANGELOG.md` with release notes (what was added/changed/fixed)
- [ ] Update `README.md` if commands, agents, or skills changed
- [ ] Verify command counts in README match actual files

## Commit + Tag

- [ ] Commit all changes: `git commit -m "release: vX.Y.Z"`
- [ ] Push: `git push origin main`
- [ ] Tag: `git tag vX.Y.Z`
- [ ] Push tag: `git push origin vX.Y.Z`

## Post-Release

- [ ] Verify GitHub Actions release workflow runs
- [ ] Verify release appears on GitHub with `tff-tools.cjs` artifact
- [ ] Reinstall plugin to test: `/plugin install the-forge-flow@the-forge-flow`

## Rules

- **tff NEVER merges.** Only create PRs. User merges via GitHub.
- **PR links are ALWAYS shown** to the user when created.
- **CHANGELOG is ALWAYS updated** for each release — no exceptions.
- **docs/ is NOT tracked** in git — internal design docs stay local.
