# Routing Phase B — Model Tier Selection

**Date:** 2026-04-18
**Status:** Design approved, pending implementation
**Depends on:** Phase A (PR #104, commit `099fc99`)

---

## Context

Phase A ships signal extraction infrastructure: `extract_signals(slice) → Signals` is wired into `/tff:ship` as a non-blocking Step 0, logging to `.tff-cc/logs/routing.jsonl`. The `route()` scoring library is fully tested but unwired — no real agent selection happens yet.

Phase B adds model tier selection: given the `Signals` Phase A produces, dynamically pick `haiku | sonnet | opus` for the agent invocation instead of using a static per-agent model profile.

**Roadmap position:** A (agent signals) → **B (model tier)** → C (layer A+B) → D (feedback loop)

---

## Goals

- Dynamically select model tier per invocation based on `Signals`
- Enforce per-agent `min_tier` safety floors (e.g., security auditor never runs on Haiku)
- Log every tier decision with a `decision_id` for Phase D join
- Zero breaking changes to Phase A; purely additive

## Non-Goals

- Wiring `route()` for agent selection (Phase C)
- Confidence-weighted tier bumping (can be added in C/D once data exists)
- Per-workflow tier policies (deferred until routing.jsonl distribution justifies it)
- Making routing decisions visible to the agent being invoked (infrastructure-only)

---

## Architecture

Phase B adds one new use-case (`select-tier`) alongside the existing `route()` use-case. No existing code changes.

```
Signals (from Phase A)
        ↓
select-tier use-case
        ├── reads: tier_policy from settings.yaml
        ├── reads: agent.min_tier from agent frontmatter
        └── resolves: max(policy_tier, agent.min_tier)
        ↓
TierDecision { tier, policy_tier, min_tier_applied, agent_id, decision_id, signals }
        ↓
logged to routing.jsonl  { kind: "tier" }
        ↓
CLI: tff-tools routing:select-tier --agent <id> --slice-id <id>
```

New files follow the same flat hexagonal layout as Phase A:

```
src/
├── domain/
│   ├── value-objects/
│   │   └── tier-decision.ts              # TierDecision Zod schema
│   ├── helpers/
│   │   └── tier-resolver.ts              # max(policy_tier, min_tier) pure fn
│   └── ports/
│       └── tier-selector.port.ts         # select-tier port
├── application/routing/
│   └── select-tier.ts                    # use-case
├── infrastructure/adapters/filesystem/
│   └── filesystem-tier-config-reader.ts  # reads tier_policy + min_tier
└── cli/commands/
    └── routing-select-tier.cmd.ts        # CLI command
```

No new subdirectories. All files land in existing layers.

---

## Config Surface

### Agent frontmatter (new optional field)

```yaml
routing:
  handles: [high_risk, auth, migrations, pii, secret, breaking]
  priority: 20
  min_tier: sonnet    # floor — never run this agent below sonnet
```

Default when absent: `haiku` (preserves current behavior, no config migration needed).

### `settings.yaml` (new `tier_policy` block)

```yaml
routing:
  tier_policy:
    low:    haiku    # complexity=low  AND risk=low
    medium: sonnet   # complexity=medium OR risk=medium
    high:   opus     # complexity=high  OR risk=high
```

Default when block is absent: `low→haiku, medium→sonnet, high→opus` (same values — feature works out-of-box with zero config changes).

### Signal → policy tier mapping rule

| complexity | risk   | policy_tier |
|------------|--------|-------------|
| low        | low    | haiku       |
| low        | medium | sonnet      |
| low        | high   | opus        |
| medium     | low    | sonnet      |
| medium     | medium | sonnet      |
| medium     | high   | opus        |
| high       | low    | opus        |
| high       | medium | opus        |
| high       | high   | opus        |

Rule: `policy_tier = max(complexity_tier, risk_tier)` where `low→haiku, medium→sonnet, high→opus`.

### Resolution rule

```
effective_tier = max(policy_tier, agent.min_tier)
```

where `haiku < sonnet < opus`.

---

## Value Object: `TierDecision`

```ts
type TierDecision = {
  tier: 'haiku' | 'sonnet' | 'opus';          // effective (after floor)
  policy_tier: 'haiku' | 'sonnet' | 'opus';   // what signals alone said
  min_tier_applied: boolean;                   // true if floor overrode policy
  agent_id: string;
  decision_id: string;                         // UUID — Phase D join key
  signals: Signals;                            // from Phase A, passed through
};
```

Additive-only contract (same guarantee as `Signals`).

---

## Logging

New `routing.jsonl` entry kind:

```jsonl
{
  "kind": "tier",
  "timestamp": "2026-04-18T15:34:53.000Z",
  "workflow_id": "tff:ship",
  "slice_id": "M01-S01",
  "decision": {
    "decision_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "agent_id": "tff-security-auditor",
    "tier": "sonnet",
    "policy_tier": "haiku",
    "min_tier_applied": true,
    "signals": { "complexity": "low", "risk": { "level": "medium", "tags": ["auth"] } }
  }
}
```

`decision_id` is a UUID generated at decision time. Phase D joins this record to an outcome record using `decision_id`. Every tier decision must have one — this is a hard contract, not optional.

---

## Wiring

Step 0 of `ship-slice.md` is extended (both commands remain non-blocking):

```markdown
0. Signal extraction and tier selection (advisory; non-blocking):
   `tff-tools routing:extract --slice-id <slice-id> --workflow tff:ship`
   `tff-tools routing:select-tier --slice-id <slice-id> --agent <agent-id>`
```

Steps 1–8 remain byte-identical (verified by existing no-regression structural test).

The CLI outputs the selected tier to stdout. The workflow reads it and passes `--model <tier>` to the agent invocation. The agent's static model profile becomes the fallback when routing is disabled or `select-tier` fails.

---

## Failure Mode

If `select-tier` fails for any reason (config parse error, unknown agent, missing frontmatter):
- Log error to stderr
- Exit 0 (non-blocking — workflow continues)
- Workflow falls back to agent's static model profile

Same graceful degradation contract as Phase A's `routing:extract`.

---

## Testing

~10–12 new test files, mirroring Phase A's layered coverage:

**Domain**
- `tier-decision.spec.ts` — valid tiers, UUID decision_id, min_tier_applied flag
- `tier-resolver.spec.ts` — all 9 signal combinations, floor override cases, tier ordering invariant

**Application**
- `select-tier.spec.ts` — full use-case: signal→tier mapping, min_tier floor, defaults when tier_policy absent, graceful error on unknown agent

**Infrastructure**
- `filesystem-tier-config-reader.spec.ts` — reads tier_policy block, reads min_tier from frontmatter, defaults to haiku when absent
- JSONL logger extended: new `kind:"tier"` entry shape

**CLI**
- `routing-select-tier.cmd.spec.ts` — flag parsing, self-gates on routing.enabled, tier to stdout, errors to stderr + exits 0

**Integration**
- No-regression structural diff: `ship-slice.md` Steps 1–8 byte-identical
- New fixture: `slice-auth-medium/SPEC.md` → medium risk + auth tag → `policy_tier=sonnet`, `min_tier=sonnet` (security-auditor floor) → `min_tier_applied=false`, `tier=sonnet`

---

## Phase D Contract (locked decisions)

These decisions are binding for Phase B implementation and must not be relaxed:

1. Every `TierDecision` has a `decision_id` (UUID). No exceptions.
2. `policy_tier` and `tier` are logged as separate fields — Phase D calibrates the policy table and agent floors independently.
3. `min_tier_applied` is logged explicitly — Phase D can detect systematic floor overrides (signal: "security-auditor's floor is overriding too often → maybe the policy table needs tuning, not the floor").
4. No routing context is injected into agent prompts — Phase D measures outcomes externally only.
5. `Signals` are passed through unchanged in the log — Phase D has the full signal picture for each decision.

---

## Open Questions (deferred to Phase C/D)

- When should confidence score from Phase A influence tier selection? (Phase C candidate)
- Per-workflow tier policy overrides? (Only after routing.jsonl data justifies it)
- How does Phase D collect outcome signals? (Explicit `routing:outcome` CLI command vs. inferred from downstream `/tff:debug` runs)
