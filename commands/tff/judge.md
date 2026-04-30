---
name: tff:judge
description: Grade routing decisions for a closed slice via the tff-outcome-judge agent
argument-hint: "<slice-label>"
allowed-tools: Read, Write, Bash, Agent
---

<objective>
Judge the model-judge outcomes for a closed slice. No Anthropic API calls — the sub-agent
uses the user's active Claude Code session.
</objective>

<preconditions>
Slice must be in `closed` status. Model-judge must be enabled in settings:

```yaml
routing:
  calibration:
    model_judge:
      enabled: true
```

If those are missing, `routing:judge-prepare` refuses with `PRECONDITION_VIOLATION` and we stop.
</preconditions>

<workflow>

## Step 1 — Prepare evidence

Run:

```bash
tff-tools routing:judge-prepare --slice <slice-label>
```

Parse the JSON output. Three outcomes:

- `{ok: true, data: {evidence: null, ...}}` — every decision is already judged (or no decisions exist). Stop; nothing to do.
- `{ok: true, data: {evidence: {...}, ...}}` — proceed to Step 2.
- `{ok: false, error}` — surface the error and stop.

Write `data.evidence` to a temp file:

```bash
EVIDENCE_PATH=$(mktemp -t tff-judge-evidence.XXXXXX.json)
# write the evidence JSON to $EVIDENCE_PATH using Write tool
```

Capture `data.slice_label` and `data.evidence.diff_summary` truncation state. If `evidence.diff_summary.patch` ends with `[truncated,` — the diff was truncated; remember this for Step 3.

## Step 2 — Dispatch tff-outcome-judge

Decide a temp path for the verdicts file:

```bash
VERDICTS_PATH=$(mktemp -t tff-judge-verdicts.XXXXXX.json)
```

Invoke the sub-agent with both paths in the prompt:

```
Evidence path: $EVIDENCE_PATH
Verdicts path: $VERDICTS_PATH

Read the evidence JSON, grade each decision per your agent instructions, and write the verdicts JSON to the Verdicts path. Return a short confirmation when complete.
```

Use the Agent tool with `subagent_type: "tff-outcome-judge"`. When the agent returns, verify the verdicts file exists and is non-empty. If the agent reported failure or the file is missing, surface the error and stop.

## Step 3 — Record outcomes

Run:

```bash
tff-tools routing:judge-record --slice <slice-label> --verdicts-path "$VERDICTS_PATH" \
  <evidence-truncated-flag-if-patch-was-truncated>
```

Where `<evidence-truncated-flag-if-patch-was-truncated>` is either `--evidence-truncated` (if the diff or spec was truncated during prepare) or nothing (if not).

Parse the JSON output. Report `{outcomes_emitted, skipped, model_judge_already_had}` to the user. Clean up the temp files:

```bash
rm -f "$EVIDENCE_PATH" "$VERDICTS_PATH"
```

</workflow>

<stop_conditions>
- `routing:judge-prepare` returns `evidence: null` → nothing to do; report and stop.
- `routing:judge-prepare` errors → surface and stop.
- Sub-agent fails to produce a verdicts file → surface and stop; leave temp files for inspection.
- `routing:judge-record` errors → surface. Temp files left for debugging.
</stop_conditions>
