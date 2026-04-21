# Quality Gates

Canonical list of quality gates in `tff-cc`, the mechanism hardening each, and the meta-test that proves the mechanism is wired in. Mirrors `src/shared/quality-gates/registry.ts` — keep them in sync.

## Catalog

| ID | Gate | Class | Mechanism | Status | Enforcement site | Meta-test |
|---|---|---|---|---|---|---|
| `fresh-reviewer` | Fresh-reviewer invariant on `recordReview` | III | adapter-invariant | enforced | `src/infrastructure/adapters/sqlite/sqlite-state.adapter.ts` | `tests/structural/review-store-fresh-reviewer-invariant.spec.ts` |
| `branch-guard` | Branch-guard chokepoint on mutating CLI commands | III | chokepoint-wrapper | enforced | `src/cli/utils/with-mutating-command.ts` | `tests/structural/branch-guard-chokepoint.spec.ts` |
| `ship-completeness` | Slice-close requires approved code + security reviews | V | adapter-invariant | enforced | `src/infrastructure/adapters/sqlite/sqlite-state.adapter.ts` | `tests/structural/slice-close-completeness-invariant.spec.ts` |
| `milestone-completeness` | Milestone-close requires approved spec review per slice | V | adapter-invariant | enforced | `src/infrastructure/adapters/sqlite/sqlite-state.adapter.ts` | `tests/structural/milestone-close-completeness-invariant.spec.ts` |
| `coverage-in-ci` | Coverage threshold enforced on every PR | II | mirror-in-ci | enforced | `.github/workflows/ci.yml` | `tests/structural/coverage-in-ci.spec.ts` |
| `commitlint-in-ci` | Commitlint enforced on every PR | II | mirror-in-ci | enforced | `.github/workflows/ci.yml` | `tests/structural/commitlint-in-ci.spec.ts` |
| `value-object-invariants` | Every value-object exports a Zod schema or parse fn | III | value-object | enforced | `src/domain/value-objects` | `tests/structural/value-object-invariants.spec.ts` |
| `command-mutates-annotation` | Every registered CLI command explicitly annotates schema.mutates | III | value-object | enforced | `src/cli/utils/flag-parser.ts` | `tests/structural/command-schema-mutates-annotation.spec.ts` |

## Classes

- **I — CI pipeline** — fires automatically via CI; regression visible in workflow diffs. Not listed above.
- **II — Config / tooling** — thresholds that exist but never fire, or checks bypassable via `--no-verify`.
- **III — Domain rules** — invariants enforced in application code.
- **IV — Skill / observation** — Stage E scope.
- **V — Agent / approval** — gates that depend on specific agent invocations producing records.

## Mechanisms

- **adapter-invariant** — rule fires on the write path of the store that owns the mutation. Bypass requires rewriting the adapter, which is visible in diff. Applies when the rule can be expressed as a property of the data being written.
- **chokepoint-wrapper** — the rule is applied by a dispatcher based on a schema flag, not opted-in by callers. Applies to cross-cutting checks whose input is environmental (git branch, process state).
- **mirror-in-ci** — anything a contributor can bypass locally (via `--no-verify`, hook skip, or never-installed hook) also runs in CI.
- **value-object** — the invariant is enforced at construction via Zod. Meta-test asserts every value-object has a public parsing entry.

## Adding a new gate

Each mechanism has a worked example already in the repo. Follow the pattern closest to your rule.

- **adapter-invariant** — see `fresh-reviewer` (call sibling port method on `this` in a write path). Implementation: `SQLiteStateAdapter.recordReview` calls `this.getExecutorsForSlice`. Tests: `tests/integration/review-store-fresh-reviewer.spec.ts` (fires), `tests/structural/review-store-fresh-reviewer-invariant.spec.ts` (spy), `tests/integration/fresh-reviewer-redundancy.spec.ts` (two-layer defense).
- **chokepoint-wrapper** — see `branch-guard`. Implementation: `src/cli/utils/with-mutating-command.ts` tags the wrapped handler with a symbol; `src/cli/index.ts` applies the wrapper when `schema.mutates === true`. Tests: `tests/integration/branch-guard-dispatcher.spec.ts` (fires), `tests/structural/branch-guard-chokepoint.spec.ts` (registry walk).
- **mirror-in-ci** — see `coverage-in-ci` or `commitlint-in-ci`. Implementation: new job in `.github/workflows/ci.yml`. Test: YAML-parsing structural spec asserting the job exists and its key steps reference the right scripts.
- **value-object** — see `value-object-invariants`. Test: globs a directory and asserts each file exports a Zod schema or `parse`/`create` fn.

### Steps

1. **Pick a mechanism** per the descriptions above.
2. **Pick an id.** Lowercase kebab-case. Must be unique across `QUALITY_GATES`.
3. **Stub the meta-test** at your target `metaTestPath` with a single `it.todo(...)`.
4. **Add the registry entry** with `status: "pending"`, pointing at the stub meta-test and the (possibly not-yet-existing) enforcement site.
5. **Add a row to this catalog** mirroring the registry entry.
6. **Implement the enforcement** at the declared `enforcementSite`.
7. **Replace the stub** with real assertions. Include at minimum:
   - A *fires* test: gate triggers on a bypass attempt.
   - A *structural* test: fails if the enforcement mechanism is removed (e.g., `vi.spyOn` on the sibling method called by an adapter-invariant; registry walk for a chokepoint wrapper).
8. **Flip the registry entry to `status: "enforced"`** in both `src/shared/quality-gates/registry.ts` and this file.

### Sanity check before committing

Temporarily remove your enforcement (comment out the check). The structural test should FAIL. Restore it. Tests should PASS. If the structural test passes even with the enforcement removed, it's not doing its job — strengthen it.

## Invariant

`tests/structural/quality-gates.spec.ts` walks `QUALITY_GATES` and fails if any entry points at a missing meta-test or enforcement site. It does *not* re-run each meta-test — those run as part of the normal vitest suite.
