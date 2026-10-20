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

### Verify model and reasoning effort independently

For the default, use the visible controls in this order: set or verify reasoning effort **High**, then select and verify **GPT-6**. If the user specifies a different model or effort for this task, use those exact values instead.

- Do not identify a control from its accessibility description alone. Use the latest accessibility tree for navigation, and compare its label and result with the rendered UI whenever the label is generic, conflicts with the screenshot, or its menu looks unrelated.
- A control visibly labeled `思考强度` / "Thinking effort" whose menu shows `High` and an effort slider is an effort control only. It is not evidence of the selected model, even if the accessibility tree calls it a model selector.
- Model evidence must independently show the requested model name as selected (for example, `GPT-6`). Effort evidence must independently show the requested effort (for example, `High`). Do not combine one value into proof of the other.
- If the menu does not expose model choices or a selected model name, or if rendered UI and accessibility labels disagree, classify the preflight as `NEEDS_MODEL_SELECTION`. Close an ambiguous menu with `Escape` if needed, then stop; do not keep clicking guessed controls, infer the model from account defaults, or send the packet.

### Pause and resume on a model-selection blocker

For `NEEDS_MODEL_SELECTION`, preserve the current Packet draft locally and tell the user exactly what was visible (including any label mismatch). Ask them to select the requested model in the same in-app Browser tab and reply when it is visibly selected. Do not ask for credentials, switch browsers, or submit anything while paused. On the next user message, recheck only the volatile login/model/effort/blocker state, using fresh UI observations and fresh control indices. Resume the original task only when all requested selections are visible and the other preflight gates pass; otherwise remain paused. A paused handoff is incomplete, not a completed failure, and must not be silently converted to another model.

For other takeover states (login or site permission), preserve the same Packet draft and use the same pause/resume behavior. Stop on CAPTCHA, rate-limit, unusual-activity, account restriction, or other states the user cannot safely clear through ordinary visible UI; do not work around them.

Before sending, record a local UI summary showing the ChatGPT origin, authenticated account UI, requested model, and absence of blockers. After completion, capture the same facts again. DOM inspection may verify visible UI state, but it must not capture response content. These are UI-level observations, not cryptographic backend-model proof.

Fill the visible composer and activate Send exactly once. Observe whether the user turn appeared, but never activate Send again. An indeterminate submission is a terminal blocker for this handoff.

Wait for one completed answer, then identify the copy control in that assistant response's own action row. Prefer a clear accessible label or tooltip such as `复制回复`. On localized pages, a shorter label such as `复制` is acceptable only after confirming that it belongs to the latest assistant response. Distinguish it from `分享`, the user's `复制消息` control, and any `复制代码` controls. Do not choose by icon order alone. If the control remains ambiguous, stop and ask the user to identify it.

Click the verified response-copy control once, then read the clipboard and validate the marked contract. If the clipboard is empty, the response is incomplete, or markers/headings are invalid, stop; do not extract response text from the DOM or retry automatically. If the user explicitly identifies a different visible control after a mis-targeted click, verify that corrected target and allow one corrected copy click; record both outcomes. Do not repeat after that correction.

Stop on login, CAPTCHA, rate-limit, unusual-activity, account restriction, permission, ambiguous-control, or selector-drift states. Do not work around them. Never call private endpoints, replay network requests, inspect cookies, local storage, session storage, or hidden auth data, and never use background, scheduled, Dockerized, headless, parallel, proxy, stealth, CAPTCHA-solving, or anti-detection execution.
