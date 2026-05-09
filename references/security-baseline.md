# Security Baseline

## When to Use

Loaded by tff-security-auditor ∀ review.

## STRIDE Threat Categories

| Category | Question | Common Findings |
|---|---|---|
| Spoofing | Can attacker impersonate user/component? | Missing auth, weak tokens |
| Tampering | Can data be modified ∈ transit/at rest? | No input validation, unsigned payloads |
| Repudiation | Can actions be denied? | Missing audit logs, ¬ timestamps |
| Information Disclosure | Can sensitive data leak? | Secrets ∈ logs, verbose errors |
| Denial of Service | Can system be overwhelmed? | No rate limiting, unbounded queries |
| Elevation of Privilege | Can user gain unauthorized access? | Missing authz, insecure defaults |

## OWASP Top 10

| # | Risk | Check |
|---|---|---|
| A01 | Broken Access Control | ∀ endpoint: authz before action |
| A02 | Cryptographic Failures | No hardcoded secrets, proper hashing |
| A03 | Injection | ∀ user_input: sanitized before queries/commands |
| A04 | Insecure Design | Threat model reviewed for new features |
| A05 | Security Misconfiguration | No debug ∈ prod, minimal permissions |
| A06 | Vulnerable Components | Deps audited, ¬ known CVEs |
| A07 | Auth Failures | Strong passwords, MFA where applicable |
| A08 | Data Integrity Failures | Signed updates, verified deps |
| A09 | Logging Failures | Security events logged, ¬ sensitive data ∈ logs |
| A10 | SSRF | ∀ URL input: validated against allowlist |

## Severity

| Level | Meaning | Blocks PR? |
|---|---|---|
| critical | Exploitable now, data loss/breach risk | Yes |
| high | Exploitable with effort, significant impact | Yes |
| medium | Limited exploitability ∨ impact | No (advisory) |
| low | Defense-∈-depth improvement | No (advisory) |
