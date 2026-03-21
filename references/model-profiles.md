# Model Profiles

Agent model assignments are configured per-project in `.tff/settings.yaml`.

## Default Profiles

### Quality Profile
Used for: brainstormer, architect, code-reviewer, security-auditor
Default model: opus

### Balanced Profile
Used for: product-lead, tester
Default model: sonnet

### Budget Profile
Used for: frontend-dev, backend-dev, devops, fixer
Default model: sonnet

## Configuration

In `.tff/settings.yaml`:

```yaml
model-profiles:
  quality:
    model: opus
  balanced:
    model: sonnet
  budget:
    model: sonnet
```

## Agent → Profile Mapping

| Agent | Profile |
|---|---|
| tff-brainstormer | quality |
| tff-architect | quality |
| tff-code-reviewer | quality |
| tff-security-auditor | quality |
| tff-product-lead | balanced |
| tff-tester | balanced |
| tff-frontend-dev | budget |
| tff-backend-dev | budget |
| tff-devops | budget |
| tff-fixer | budget |
