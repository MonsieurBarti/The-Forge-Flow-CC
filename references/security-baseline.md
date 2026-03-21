# Security Baseline

## When to Use

Loaded by tff-security-auditor ∀ review.

## STRIDE Threat Categories

| Category | Question | Common Findings |
|---|---|---|
| Spoofing | Can attacker impersonate user/component? | Missing auth, weak tokens |
| Tampering | Can data be modified in transit/at rest? | No input validation, unsigned payloads |
| Repudiation | Can actions be denied? | Missing audit logs, no timestamps |
| Information Disclosure | Can sensitive data leak? | Secrets in logs, verbose errors |
| Denial of Service | Can system be overwhelmed? | No rate limiting, unbounded queries |
| Elevation of Privilege | Can user gain unauthorized access? | Missing authz, insecure defaults |

## OWASP Top 10

| # | Risk | Check |
|---|---|---|
| A01 | Broken Access Control | ∀ endpoint: authz before action |
| A02 | Cryptographic Failures | No hardcoded secrets, proper hashing |
| A03 | Injection | ∀ user_input: sanitized before queries/commands |
| A04 | Insecure Design | Threat model reviewed for new features |
| A05 | Security Misconfiguration | No debug in prod, minimal permissions |
| A06 | Vulnerable Components | Deps audited, no known CVEs |
| A07 | Auth Failures | Strong passwords, MFA where applicable |
| A08 | Data Integrity Failures | Signed updates, verified deps |
| A09 | Logging Failures | Security events logged, no sensitive data in logs |
| A10 | SSRF | ∀ URL input: validated against allowlist |

## Severity

| Level | Meaning | Blocks PR? |
|---|---|---|
| critical | Exploitable now, data loss/breach risk | Yes |
| high | Exploitable with effort, significant impact | Yes |
| medium | Limited exploitability or impact | No (advisory) |
| low | Defense-in-depth improvement | No (advisory) |
