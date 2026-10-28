# Static Skill Doctor

For the distinction between native desktop control and first-party Browser capability, see [computer-use.md](computer-use.md). A working native Windows Computer Use interface never substitutes for a live `type: "iab"` Browser surface.

Run the static package check before opening ChatGPT or changing local bridge access. For a browser handoff, first inspect the current runtime tool inventory, then pass the exact supported transport:

```bash
node scripts/skill-doctor.mjs --json --browser-capability cua-repl-iab
```

Use `bundled-browser` only when `browser:control-in-app-browser` and its callable interface are present. Use `cua-repl-iab` only when `mcp__cua_repl` is callable and its API documents the first-party `type: "iab"` surface. Use `unavailable` when neither is present. The Doctor does not inspect runtime inventory itself; a supported value must never be assumed.

Required package paths must be readable regular files. To compare the controlled files in the current skill and another copy, pass the other skill root explicitly:

```bash
node scripts/skill-doctor.mjs --compare-root /path/to/other/codex-chatgpt-bridge
```

The comparison covers the controlled skill, bridge scripts, handoff tools, and references listed by this Doctor and reports SHA-256 differences. It does not prove code safety or runtime health. `installation_status: READY` checks required files, package name, and Node runtime. Overall `status: READY` additionally requires a supported Browser capability and a current risk acknowledgement; it does not prove login, model selection, site permission, or a successful handoff. The `browser_automation_consent` field reports the separate risk acknowledgement. For local bridge operations, use `installation_status` and the task-scoped local-bridge authorization rules; Browser capability and browser-risk acknowledgement are not prerequisites. Use the service `Doctor` action separately to verify live bridge health.

`--consent-state-file <path>` is available for isolated tests or an explicitly chosen local state file. The installed package keeps its own risk state; do not copy or migrate state from the source package.

Run the focused regression suite after changing the validator, consent state, Skill Doctor, or packet contract:

```bash
node --test tests/bridge-regression.test.mjs
```

Doctor does not run this suite automatically. `installation_status: READY` checks package presence and runtime; overall `status: READY` also requires Browser capability and current risk acknowledgement. The regression suite checks the local behavior covered by its cases.

For browser handoffs, stop on `NEEDS_BROWSER`, `MISSING_RUNTIME`, or `INVALID_INSTALLATION`. If only risk acknowledgement is missing or stale, complete the task-specific acknowledgement below, rerun the Doctor with the same Browser capability, and continue only when overall `status` is `READY`. For local bridge operations, continue only when `installation_status` is `READY`. Report `MISSING_RUNTIME` when Node.js 18 or newer is unavailable. Report `INVALID_INSTALLATION` with failed check IDs when required Skill files are missing or the installed package name is wrong.

Only for a task whose current user request calls for ChatGPT browser use, check the saved risk acknowledgement:

```bash
node scripts/automation-consent.mjs status --json
```

Risk acknowledgement statuses:

- `NEEDS_AUTOMATION_CONSENT`: no current decision exists, the file is invalid, the disclosure changed, or the disclosure file is unavailable.
- `AUTOMATION_DISABLED`: the user declined or revoked browser-risk acknowledgement.
- `RISK_ACKNOWLEDGED`: the exact current disclosure text was explicitly accepted. This is risk acceptance only, not authorization for a particular or future handoff.

For `NEEDS_AUTOMATION_CONSENT`, show the complete text in [`references/automation-disclosure.md`](automation-disclosure.md) without softening it. The state stores a SHA-256 digest of that file, so any content change invalidates prior risk acknowledgement. A disabled decision remains disabled across disclosure changes. Schema 1 state is not migrated; the user must acknowledge the current disclosure directly.

Only for a task that already calls for a browser handoff, ask whether the user acknowledges this risk. An affirmative response must be explicit and present in the current conversation. Silence, invoking the Skill, or an unrelated reply is not consent. Only then run:

```bash
node scripts/automation-consent.mjs enable --acknowledge-risk I_ACKNOWLEDGE_EXPERIMENTAL_BROWSER_RISK_V2 --json
```

The acknowledgement token is public and is only an accidental-use check; it does not authenticate the user or prove that the disclosure was shown. The saved state records risk acknowledgement only, not authorization for any particular task. Schema 1 state is not migrated; the user must acknowledge the current disclosure directly. This is an agent workflow gate, not a host-level browser lock, and cannot remove the Browser tool from an agent that ignores this Skill. Treat `AUTOMATION_DISABLED` and `NEEDS_AUTOMATION_CONSENT` as stop states even when the Browser tool is available.

On decline run `node scripts/automation-consent.mjs disable --json`. For `AUTOMATION_DISABLED`, do not open, claim, inspect, or control ChatGPT.

Then perform the volatile browser checks on every handoff:

1. Inspect the runtime surface. Return `NEEDS_DESKTOP_APP` only when it explicitly identifies CLI, IDE, cloud, Linux, or another unsupported surface.
2. On a supported Mac or Windows desktop surface, return `NEEDS_BROWSER` unless the runtime inventory identifies a callable first-party `browser:control-in-app-browser` interface or a callable `mcp__cua_repl` interface whose API confirms `type: "iab"`. This does not allow Edge/Chrome extensions, ordinary browsers, direct APIs, or another model.
3. Open or claim `https://chatgpt.com/` only in the in-app Browser.
4. Check visible account UI. If logged out, report `NEEDS_CHATGPT_LOGIN`, ask the user to take over the page, and preserve the original task for resume.
5. Check the requested model and reasoning effort in visible UI as two independent values. If the user has not specified them for this task, follow [model-selection.md](model-selection.md): set or verify reasoning effort **High** first, then follow the visible `High ›` submenu to reveal the model list and select **GPT-6**. Do not trust an accessibility description alone when the rendered label or opened menu disagrees; a `思考强度`/"Thinking effort" menu showing High is evidence of effort only. If the selected model name or effort cannot be visibly confirmed, report `NEEDS_MODEL_SELECTION`, preserve the Packet draft, and ask the user to take over model selection in the same in-app Browser tab. Never submit early or silently substitute another model or effort.
6. If site access is blocked, report `NEEDS_SITE_PERMISSION` and follow the Browser Skill's permission flow.
7. Return `READY` only after authentication, the requested model and effort, and every required browser check are visibly satisfied.

Never call private ChatGPT endpoints or inspect cookies, local storage, session storage, hidden authentication headers, browser profiles, passwords, verification codes, or credential files. Human login is a takeover step, not an automation step.
