# Browser Transport

Use the Codex in-app Browser in the Mac or Windows ChatGPT desktop app. Keep the same ChatGPT tab through one submission and one visible response copy. The transport is Unofficial Experimental.

If `browser:control-in-app-browser` is unavailable, a single task may use the current Codex in-app Browser only when the user explicitly authorizes this fallback in the current conversation and runtime inventory identifies it as a first-party in-app browser (`type: "iab"`). This exception permits that specific transport from the current Codex desktop session. It does not permit Edge/Chrome extensions, ordinary browsers, MCP Apps, direct APIs, alternate models, or switching transports mid-run. Versioned risk consent and all packet privacy checks still apply.

Automatic preflight returns exactly one status:

- `NEEDS_DESKTOP_APP`: the runtime explicitly identifies CLI, IDE, cloud, Linux, or another unsupported surface.
- `NEEDS_BROWSER`: a supported Mac or Windows desktop surface lacks the required Browser Skill or capability.
- `NEEDS_CHATGPT_LOGIN`: the ChatGPT page visibly shows a logged-out state.
- `NEEDS_MODEL_SELECTION`: the requested model is not visibly selected or available.
- `NEEDS_SITE_PERMISSION`: browser access to ChatGPT is blocked pending user action.
- `READY`: authentication, requested model, and transport capability are visibly available.

When human takeover is needed, keep the original repository task and current Packet draft local. Ask the user to finish the visible login, model, or permission step without sending credentials in chat. On their next message, recheck only the volatile browser state and continue the original task.

For the default model, use the visible controls in this order: set reasoning effort to **High**, then select **GPT-6**. If the user specifies a different model or effort for this task, use that exact preference instead. Stop at `NEEDS_MODEL_SELECTION` when the requested option is absent or its selected state cannot be verified; do not infer which model is strongest from memory.

Before sending, record a local UI summary showing the ChatGPT origin, authenticated account UI, requested model, and absence of blockers. After completion, capture the same facts again. DOM inspection may verify visible UI state, but it must not capture response content. These are UI-level observations, not cryptographic backend-model proof.

Fill the visible composer and activate Send exactly once. Observe whether the user turn appeared, but never activate Send again. An indeterminate submission is a terminal blocker for this handoff.

Wait for one completed answer, then identify the copy control in that assistant response's own action row. Prefer a clear accessible label or tooltip such as `复制回复`. On localized pages, a shorter label such as `复制` is acceptable only after confirming that it belongs to the latest assistant response. Distinguish it from `分享`, the user's `复制消息` control, and any `复制代码` controls. Do not choose by icon order alone. If the control remains ambiguous, stop and ask the user to identify it.

Click the verified response-copy control once, then read the clipboard and validate the marked contract. If the clipboard is empty, the response is incomplete, or markers/headings are invalid, stop; do not extract response text from the DOM or retry automatically. If the user explicitly identifies a different visible control after a mis-targeted click, verify that corrected target and allow one corrected copy click; record both outcomes. Do not repeat after that correction.

Stop on login, CAPTCHA, rate-limit, unusual-activity, account restriction, permission, ambiguous-control, or selector-drift states. Do not work around them. Never call private endpoints, replay network requests, inspect cookies, local storage, session storage, or hidden auth data, and never use background, scheduled, Dockerized, headless, parallel, proxy, stealth, CAPTCHA-solving, or anti-detection execution.
