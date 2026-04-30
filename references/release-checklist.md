# Release Checklist

Complete ALL steps ∈ order before every release.

## Pre-Release

- [ ] All tests pass: `npx vitest run`
- [ ] Type check passes: `npx tsc --noEmit`
- [ ] Build succeeds: `npm run build`
- [ ] CLI works: `node dist/cli/index.js --help`

## Version Bumps

- [ ] Bump version ∈ `package.json` (`"version": "X.Y.Z"`)
- [ ] Bump version ∈ `.claude-plugin/plugin.json` (`"version": "X.Y.Z"`)
- [ ] Bump version ∈ `plugin/.claude-plugin/plugin.json` (`"version": "X.Y.Z"`)
- [ ] Update `src/cli/index.ts` version string if hardcoded

## Documentation

- [ ] Update `CHANGELOG.md` with release notes (added/changed/fixed)
- [ ] Update `README.md` if commands, agents, ∨ skills changed
- [ ] Verify command counts ∈ README match actual files

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

- **tff NEVER merges.** Only creates PRs. User merges via GitHub.
- **PR links ALWAYS shown** to user when created.
- **CHANGELOG ALWAYS updated** ∀ release — ¬ exceptions.
- **docs/ is NOT tracked** ∈ git — internal design docs stay local.
