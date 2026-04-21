# Quality Gates

Canonical list of quality gates in `tff-cc`, the mechanism hardening each, and the meta-test that proves the mechanism is wired in. Mirrors `src/quality-gates.registry.ts` — keep them in sync.

## Catalog

| ID | Gate | Class | Mechanism | Status | Enforcement site | Meta-test |
|---|---|---|---|---|---|---|
| `fresh-reviewer` | Fresh-reviewer invariant on `recordReview` | III | adapter-invariant | enforced | `src/infrastructure/adapters/sqlite/sqlite-state.adapter.ts` | `tests/structural/review-store-fresh-reviewer-invariant.spec.ts` |
| `branch-guard` | Branch-guard chokepoint on mutating CLI commands | III | chokepoint-wrapper | enforced | `src/cli/utils/with-mutating-command.ts` | `tests/structural/branch-guard-chokepoint.spec.ts` |
| `ship-completeness` | Slice-close requires approved code + security reviews | V | adapter-invariant | enforced | `src/infrastructure/adapters/sqlite/sqlite-state.adapter.ts` | `tests/structural/slice-close-completeness-invariant.spec.ts` |
| `milestone-completeness` | Milestone-close requires approved spec review per slice | V | adapter-invariant | enforced | `src/infrastructure/adapters/sqlite/sqlite-state.adapter.ts` | `tests/structural/milestone-close-completeness-invariant.spec.ts` |
| `coverage-in-ci` | Coverage threshold enforced on every PR | II | mirror-in-ci | enforced | `.github/workflows/ci.yml` | `tests/structural/coverage-in-ci.spec.ts` |
| `commitlint-in-ci` | Commitlint enforced on every PR | II | mirror-in-ci | enforced | `.github/workflows/ci.yml` | `tests/structural/commitlint-in-ci.spec.ts` |
| `value-object-invariants` | Every value-object exports a Zod schema or parse fn | III | value-object | pending | `src/domain/value-objects` | `tests/structural/value-object-invariants.spec.ts` |

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

1. **Pick a mechanism.** Use the table above. If the rule is relational or needs external state (git, filesystem), prefer chokepoint-wrapper. If the rule is a property of the data being written, prefer adapter-invariant.
2. **Pick an id.** Lowercase kebab-case. Must be unique.
3. **Stub the meta-test.** Create the file at your target `metaTestPath` with a single `it.todo(...)`.
4. **Add the registry entry** with `status: "pending"`, pointing at the stub meta-test and the (possibly not-yet-existing) enforcement site.
5. **Add a row to this catalog.**
6. **Implement the enforcement.**
7. **Replace the stub meta-test with real assertions.** Include at least one fires test (gate triggers on a bypass attempt) and one structural test (fails if the mechanism is silently removed).
8. **Flip the registry entry to `status: "enforced"`.**

## Invariant

`tests/structural/quality-gates.spec.ts` walks `QUALITY_GATES` and fails if any entry points at a missing meta-test or enforcement site. It does *not* re-run each meta-test — those run as part of the normal vitest suite.
