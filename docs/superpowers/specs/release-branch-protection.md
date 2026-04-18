# Release Branch Protection — Maintainer Operational Note

**Status:** manual setup required. Repo admin must apply this on GitHub.

## Why

The `release` branch is a build artifact, not a source branch. The marketplace
manifest on `main` pins plugin consumers to it (see `marketplace.json`), so
whatever lands on `release` is what every consumer installs on their next
`claude /plugin update`. Until branch protection is applied, any maintainer
commit or merged PR that alters `.github/workflows/release.yml` could
redirect what consumers install. **Treat this as a pre-production state.**

Only the release-please workflow (`.github/workflows/release.yml`) should
push to `release`, and it does so via `scripts/sync-release-branch.sh` using
`git push --force origin release`. That force-push is intentional (the
release branch is a snapshot, not a growing history), but every other source
of writes must be denied.

## Recommended rules (Settings -> Branches -> Add rule, pattern: `release`)

- **Require linear history.** No manual merges; the sync script force-pushes
  a single commit each release.
- **Restrict who can push** to a single bot identity — preferably a
  dedicated deploy key (write-only, scoped to `release` only). Revoke the
  default `GITHUB_TOKEN` write path on this branch by routing the workflow
  through a deploy key stored in `SSH_DEPLOY_KEY_RELEASE` secret.
- **Disallow force-pushes from users.** Allow force-push only from the bot
  identity above (GitHub exposes "Allow force pushes -> Specify who can
  force push").
- **Do not require PR reviews** on this branch — the workflow does not open
  PRs against `release`, it pushes directly.
- **Do not require status checks** on this branch — the upstream CI already
  ran on `main` before release-please cut the tag.

## Deploy key setup (maintainer, one-time)

1. `ssh-keygen -t ed25519 -f tff-release-deploy -C "tff-release-bot"`
2. Add the public key as a deploy key on the repo with **write access**,
   title "release-branch-writer".
3. Add the private key as repo secret `SSH_DEPLOY_KEY_RELEASE`.
4. Update `.github/workflows/release.yml` to configure git to use that key
   before invoking `scripts/sync-release-branch.sh` (swap `GITHUB_TOKEN`
   env var for ssh remote).
5. Flip the branch protection rule to allow force-push only from the bot
   identity that owns that key.

## References

- `.github/workflows/release.yml` — the only legitimate writer.
- `scripts/sync-release-branch.sh` — force-push mechanics.
- `.github/workflows/release-branch-validation.yml` — post-push sanity check
  that runs on every push to `release`.
