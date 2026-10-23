# Changelog

All notable changes to this project are documented here.

This project follows [Semantic Versioning](https://semver.org/). Versions stay in the
`0.x` range while the trust boundary is still policy-based rather than sandbox-enforced —
see the Security Model section in [README.md](README.md).

## [Unreleased]

### Added

- Unified the existing `codex-chatgpt-bridge` entrypoint with a consented, one-turn in-app Browser handoff for `L0_NO_TOOL` reasoning, including visible model checks, packet/result validation, and a redacted local completion receipt.
- Added automation-consent state, a static Skill Doctor, and focused regression tests for the browser handoff contracts.
- Added an explicit model-selection guide for setting High effort first, then opening the model menu from the displayed High control and selecting GPT-6.
- Documented the separate authorization boundaries for direct browser handoffs and OAuth-gated DevSpace access.
- Added a single-source browser automation disclosure and a Doctor field that reports browser consent separately from package readiness.

### Changed

- Removed level-based auto-approval guidance for DevSpace tasks. `L1`–`L3` are policy labels, so local bridge use now requires explicit task-scoped user authorization and action-by-action scope checks.
- Changed browser automation state to schema 2 and bound risk acknowledgement to the SHA-256 digest of the exact disclosure. Old schema 1 state is not migrated.
- Separated saved risk acknowledgement from task authorization: each handoff still needs a current user request that calls for ChatGPT Browser use. The stored decision does not authorize current or future tasks or change host approval settings.
- Made the Doctor report installation, Browser capability, and risk acknowledgement separately, and fail closed for the browser route when any gate is missing.
- Tightened the visible response-copy rule: hover the first response action and click only when its tooltip says `复制回复`; skip it when the tooltip says `分享`.
- Clarified that browser consent is an agent workflow gate, not a host-level lock on browser capabilities.

## [0.3.0] - 2026-07-23

Hardening release for reboot recovery, credential storage, and multi-root access.

### ⚠️ Breaking

- **Plaintext Cloudflare credentials are now rejected.** Controller-driven `On` and
  `Reboot` refuse to run against a legacy plaintext `cf-api.json`. Re-store the token with
  `set_cf_api_config.ps1 -Action Set`, which prompts securely and encrypts it with Windows
  DPAPI (`CurrentUser`). The helper removes the old plaintext file after a verified
  migration. DPAPI protects the file at rest only — it is not a privilege boundary, since
  the bridge, the controller, and `run_shell` all run as the same Windows user.
- **`Reboot` no longer reopens a bridge that was intentionally stopped.** After `Off`, a
  Reboot request fails instead of reopening the endpoint, so an external recovery task
  cannot undo a deliberate shutdown. Use `On` to reopen.

### Added

- `-AllowedRoots "<root1>;<root2>"` on `Configure`, stored as profile schema v2 and
  forwarded to DevSpace on every `On` and `Restart`, so later configuration runs no longer
  collapse access back to a single root. `ProjectRoot` must sit inside one of the roots.
- Authenticode verification for `-InstallCloudflared`: the downloaded binary must carry a
  valid Windows signature from Cloudflare, Inc. before it is installed or run.
- Security warnings in `Doctor` for overly broad allowed roots — drive roots, the full user
  profile, and ancestors of the user profile are flagged.
- Public base URL validation: stable Worker and external URLs must use HTTPS and may not
  contain embedded credentials, a query string, or a fragment.
- Static validation coverage grew from 168 to 426 lines, adding assertions for DPAPI
  round-trip, legacy plaintext rejection, unsafe and insecure URL rejection, invalid port
  rejection, unrelated port-owner preservation, stale recorded PID preservation, broad
  allowed-root warnings, Quick Tunnel ordering before KV refresh, and Reboot-while-Off
  rejection.

### Changed

- Stop and restart cleanup is scoped to the configured listener port. An unrelated process
  owning that port is reported and preserved; recovery fails with a conflict instead of
  killing it. A stale recorded PID is likewise preserved rather than terminated blindly.
- Shell-command logging is now opt-in, defaulting to disabled to avoid retaining secrets
  passed as command arguments. Set the user-level `DEVSPACE_LOG_SHELL_COMMANDS=true` only
  when an audit trail is genuinely needed.
- `worker-proxy.json` is derived from the saved controller profile and holds only
  non-credential operational metadata. It still contains your Worker URL and KV namespace
  ID, so keep it local and out of git.

## [0.2.0] - 2026-07-12

Introduced the external control layer.

### Added

- `scripts/bridge_controller.ps1`: a desired-state controller that keeps a non-secret
  profile separate from transient runtime state, serializes mutations with a mutex, and
  treats `Restart` and `Reboot` as one verified transaction — stop, start, refresh Worker
  KV when configured, then verify the local, Quick Tunnel, and stable Worker endpoints
  against the expected `200/401` health contract before reporting success.
- `On` and `Off` record intent, so a deliberate shutdown is no longer indistinguishable
  from a crash. `Off` closes the service and tunnel while preserving the ChatGPT app
  configuration and authorization, so the next `On` reuses the same app.
- `scripts/restart_task.ps1`: an optional on-demand Windows scheduled task with no
  automatic trigger, providing a recovery entrypoint from outside the bridge process. It
  improves reliability only; it is not a security boundary.
- `scripts/set_cf_api_config.ps1`: DPAPI-protected Cloudflare credential storage and
  automatic Worker KV upstream refresh, so a rotating Quick Tunnel URL stays hidden behind
  a stable public URL.
- `tests/static_validation.ps1`: static parse and behavior validation for the scripts.

### Changed

- Low-level `Start` and `Stop` became recovery primitives. Normal lifecycle operations go
  through the controller.

## [0.1.0] - 2026-07-04

Initial public release.

### Added

- The `codex-chatgpt-bridge` skill: routing policy for handing work between local
  execution and ChatGPT reasoning/review, `L0`–`L5` permission levels, task-packet and
  action-manifest formats, and human approval gates.
- `scripts/local_bridge.ps1` with `Start`, `Stop`, `Status`, `Doctor`, and `Rotate`,
  driving the upstream [DevSpace](https://github.com/Waishnav/devspace) MCP bridge
  (`@waishnav/devspace`) with Cloudflare Quick Tunnel support.
- `install.ps1`, which backs up an existing installation to a timestamped directory before
  copying the new skill.
- English and Simplified Chinese documentation, plus `agent-setup.md` for agent-driven
  installation.

[0.3.0]: https://github.com/Zhenyu98/codex-chatgpt-bridge/releases/tag/v0.3.0
[0.2.0]: https://github.com/Zhenyu98/codex-chatgpt-bridge/commit/527a93ae661b89a966218ff391ce1923b3f033fc
[0.1.0]: https://github.com/Zhenyu98/codex-chatgpt-bridge/commit/ea0558bccffdbd9106f7720e8676226bf245edc3
