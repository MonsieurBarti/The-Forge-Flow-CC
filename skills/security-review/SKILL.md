---
name: security-review
description: "Use when running security review on a diff/PR/file. Research-vs-Reporting discipline, three-tier confidence gate, attacker-controllable taxonomy."
---

# Security Review

## When to Use

∀ security review (slice ship, milestone audit, ad-hoc `/security-review`). Pairs with @references/security-baseline.md (STRIDE / OWASP Top 10).

## HARD-GATE: Research vs Reporting

**Report on**: only the file/diff/code provided.
**Research**: the entire codebase to build confidence before reporting.

¬report findings on pattern matching alone. ∀ candidate finding:
1. Trace data flow source -> sink
2. Check sanitization, validation, framework defenses ∈ between
3. Confirm the source is attacker-controllable
4. Only then: report

A grep hit is a hypothesis, not a finding.

## Three-Tier Confidence Gate

```
HIGH    -> report as [VULN-NNN]: clear exploit, attacker-controlled source reaches dangerous sink
MEDIUM  -> note as [VERIFY-NNN]: plausible but unconfirmed; needs human review
LOW     -> do NOT report: theoretical, framework-mitigated, or speculative
```

Confidence is orthogonal to severity. A HIGH-confidence Minor still ships as `[VULN-NNN]`. A MEDIUM-confidence Critical ships as `[VERIFY-NNN]` with explicit "reason for uncertainty".

| Confidence | Required evidence |
|---|---|
| HIGH | Source traced to attacker input ∧ sink reached unsanitized ∧ exploit path articulable |
| MEDIUM | Suspicious pattern ∧ ¬able to fully trace ∨ framework defense unclear |
| LOW | Pattern only; no traced flow; framework likely mitigates |

## Source Taxonomy

The single most important question: **is the source attacker-controllable?**

| Attacker-controlled (UNSAFE) | Server-controlled (SAFE) |
|---|---|
| HTTP request body / query / params | Hardcoded constants ∈ source |
| HTTP headers / cookies | `process.env.X` / config files / settings module |
| URL path segments | Database rows written by trusted code only |
| File uploads (name, content, MIME) | Internal service calls (authenticated, mutual TLS) |
| WebSocket message payloads | Compile-time string literals |
| User-supplied filenames or paths | Build-time generated assets |
| External webhook payloads | Output of cryptographic primitives on safe input |
| Browser-supplied JWT claims (¬ verified) | Verified-then-trusted JWT claims |

Contrast:

```ts
// UNSAFE — req.query.url is attacker-controlled
await fetch(req.query.url);

// SAFE — config.UPSTREAM_URL is server-controlled
await fetch(config.UPSTREAM_URL);
```

A SAFE source can become UNSAFE if reachable by an attacker upstream (e.g. DB row written by user input). Trace one hop further when in doubt.

## Quick Patterns Reference

### Always Flag — Critical

```
raw SQL with string concat / template:           `query("SELECT ... " + x)`
eval / Function constructor on dynamic input:    `eval(x)`, `new Function(x)`
child_process.exec / spawn shell with user input
deserialize untrusted (pickle, YAML.load, Marshal)
secrets ∈ committed code (keys, tokens, passwords)
SSRF: fetch/http on user-supplied URL ¬allowlisted
path traversal: `fs.readFile(req.params.x)` w/o normalize+contain
```

### Always Flag — High

```
hardcoded JWT secret / signing key
missing CSRF token on state-changing route (non-API ∨ cookie auth)
unauthenticated admin / internal endpoint
plaintext password storage ∨ weak hash (md5, sha1, unsalted)
weak crypto (DES, RC4, ECB mode, predictable IV)
authz check missing ∈ object access (IDOR shape)
open redirect on user-supplied URL
```

### Always Flag — Secrets (regex-shaped)

```
aws_access_key_id\s*=\s*AKIA[0-9A-Z]{16}
-----BEGIN (RSA |EC |OPENSSH |)PRIVATE KEY-----
ghp_[A-Za-z0-9]{36}
xox[baprs]-[A-Za-z0-9-]{10,}
sk-[A-Za-z0-9]{32,}
postgres(ql)?:\/\/[^:]+:[^@]+@
```

### Check Context First — FLAG vs SAFE

| Pattern | FLAG when | SAFE when |
|---|---|---|
| `dangerouslySetInnerHTML` | input is user-controlled ∨ untrusted | input is markdown rendered server-side via sanitizing library |
| `child_process.exec(cmd)` | `cmd` interpolates user input | `cmd` is a hardcoded literal ∨ uses execFile w/ argv array |
| `pickle.loads(data)` / `YAML.load` | `data` came from network ∨ user | `data` came from trusted internal source ∨ test fixture |
| `fs.readFile(path)` | `path` derives from request ¬ normalized + contained | `path` is a constant ∨ resolved against an allowlist |
| `fetch(url)` server-side | `url` is user-supplied ¬ allowlisted | `url` is config-driven ∨ matched against host allowlist |
| `redirect(target)` | `target` from query/body ¬ validated | `target` is internal route literal ∨ allowlist-matched |

## Output Schema

∀ finding: emit a block matching the template exactly. ¬prose between blocks.

```
## Findings

### [VULN-001] <short title> — <Critical|High|Medium> severity
**Location:** path/to/file.ts:42
**Confidence:** HIGH
**Issue:** one-paragraph description of the vulnerability
**Impact:** what an attacker can do (concrete, not abstract)
**Evidence:** code snippet showing the vulnerable flow (source -> sink)
**Fix:** concrete remediation, ideally with diff

### [VERIFY-002] <short title> — needs human review
**Location:** path/to/file.ts:123
**Confidence:** MEDIUM
**Reason for uncertainty:** why we can't confirm (e.g. couldn't trace caller, framework defense unclear)
**Suggested check:** what the human reviewer should look at
```

Severity vocabulary maps to @references/security-baseline.md (Critical / High / Medium / Low). Confidence (HIGH / MEDIUM / LOW) is orthogonal.

If ∅ findings: emit `## Findings\n\nNo issues found at HIGH or MEDIUM confidence.`

## Anti-Patterns

- Reporting LOW-confidence findings to look thorough
- Flagging a pattern w/o tracing data flow
- Treating server-controlled sources as attacker-controlled (false positives)
- Speculating about exploits without an articulable path
- Reporting findings outside the diff scope (research is unbounded; reporting is not)
- Conflating severity with confidence

## Rules

- ∀ finding: filepath:line required
- ∀ HIGH-confidence finding: source -> sink trace ∈ Evidence
- ∀ MEDIUM-confidence finding: explicit "Reason for uncertainty"
- LOW confidence -> ¬report, ¬verify-block, ¬footnote
- Report only on changed code; research the whole repo to confirm
- Block PR on Critical ∨ High at HIGH confidence; advise on Medium

## Future Work

Per-class playbooks (SQLi, SSRF, XSS, deserialization, auth/session, crypto, secrets) and language guides (TS, Python) are out of scope for this skill. If recurring false positives ∨ misses surface, add `references/security-review/<class>.md` and link from here.
