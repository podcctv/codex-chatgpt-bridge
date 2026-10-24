# Browser Transport

Use one supported first-party in-app Browser transport for the full handoff: prefer `browser:control-in-app-browser` when callable; otherwise use `mcp__cua_repl` only when the current runtime inventory exposes it and its API documents the first-party `type: "iab"` surface. The Doctor must receive the capability selected from that inventory. This transport is Unofficial Experimental.

Use browser automation only when the current user's request calls for a ChatGPT browser handoff. The saved `RISK_ACKNOWLEDGED` status records acceptance of the risk disclosure only. It does not authorize this or a future task, local bridge access, or a host-level permission change. Skill invocation, prior consent, and ChatGPT recommendations do not supply current-task authorization. Apply the same risk acknowledgement and packet privacy checks to either supported transport.

Automatic preflight returns exactly one status:

- `NEEDS_DESKTOP_APP`: the runtime explicitly identifies CLI, IDE, cloud, Linux, or another unsupported surface.
- `NEEDS_BROWSER`: a supported Mac or Windows desktop surface lacks the required Browser Skill or capability.
- `NEEDS_CHATGPT_LOGIN`: the ChatGPT page visibly shows a logged-out state.
- `NEEDS_MODEL_SELECTION`: the requested model is not visibly selected, or its selected state cannot be determined.
- `NEEDS_SITE_PERMISSION`: browser access to ChatGPT is blocked pending user action.
- `NEEDS_AUTOMATION_CONSENT`: risk acknowledgement is missing, stale, or unavailable.
- `AUTOMATION_DISABLED`: the user revoked risk acknowledgement.
- `READY`: the current user task requests a handoff, risk acknowledgement and transport capability are available, authentication and requested model and effort are visibly verified, and no human takeover is required.

When human takeover is needed, keep the original repository task and current Packet draft local. Ask the user to finish the visible login, model, or permission step without sending credentials in chat. On their next message, recheck only the volatile browser state and continue the original task.

### Verify model and reasoning effort independently

For the default, use the visible controls in this order: set or verify reasoning effort **High**, then select and verify **GPT-6**. Read [model-selection.md](model-selection.md) for the exact click and verification sequence. In the current composer layout the first model-control click can open a popover that only contains the High slider; click the visible `High ›` label in that popover to expand the actual model list. If the user specifies a different model or effort for this task, use those exact values instead.

- Do not identify a control from its accessibility description alone. Use the latest accessibility tree for navigation, and compare its label and result with the rendered UI whenever the label is generic, conflicts with the screenshot, or its menu looks unrelated.
- A control visibly labeled `思考强度` / "Thinking effort" whose menu shows `High` and an effort slider is an effort control only. It is not evidence of the selected model, even if the accessibility tree calls it a model selector.
- Model evidence must independently show the requested model name as selected (for example, a rendered checkmark beside `GPT-6`, corroborated by the fresh accessibility tree's selected state such as `Value: 1`). Effort evidence must independently show the requested effort (for example, `High`). Do not combine one value into proof of the other.
- If the expanded model menu does not expose model choices or a selected model name, or if rendered UI and accessibility labels disagree, classify the preflight as `NEEDS_MODEL_SELECTION`. Close an ambiguous menu with `Escape` if needed, then stop; do not keep clicking guessed controls, infer the model from account defaults, or send the packet.

### Pause and resume on selection and access blockers

For `NEEDS_MODEL_SELECTION`, preserve the current Packet draft locally and tell the user exactly what was visible (including any label mismatch). Ask them to select the requested model in the same in-app Browser tab and reply when it is visibly selected. Do not ask for credentials, switch browsers, or submit anything while paused. On the next user message, recheck only the volatile login/model/effort state, using fresh UI observations and fresh control indices. Resume the original task only when all requested selections are visible and the other preflight gates pass; otherwise remain paused. A paused handoff is incomplete, not a completed failure, and must not be silently converted to another model.

For other takeover states (login or site permission), preserve the same Packet draft and use the same pause/resume behavior. Stop on CAPTCHA, rate-limit, unusual-activity, account restriction, or other states the user cannot safely clear through ordinary visible UI; do not work around them.

Before sending, record a local UI summary showing the ChatGPT origin, authenticated account UI, requested model, and requested effort. After completion, capture the same facts again. DOM inspection may verify visible UI state, but it must not capture response content. These are UI-level observations, not cryptographic backend-model proof.

Fill the visible composer and activate Send exactly once when the control is enabled. If Send is disabled, report that the page prevented submission. Observe whether the user turn appeared, but never activate Send again. An indeterminate submission or a ChatGPT rejection is terminal; report it and do not retry.

Wait for one completed answer, then identify the copy control in that assistant response's own action row. In the layout the user identified, hover the first action button and click only when its tooltip says `复制回复`; if it says `分享`, inspect the other response action. On localized pages, a shorter label such as `复制` is acceptable only after confirming that it belongs to the latest assistant response. Distinguish it from the user's `复制消息` control and any `复制代码` controls. Do not choose by icon order alone. If the control remains ambiguous, stop and ask the user to identify it.

Click the verified response-copy control once, then read the clipboard and validate the marked contract. If the clipboard is empty, the response is incomplete, or markers/headings are invalid, stop; do not extract response text from the DOM or retry automatically. If the user explicitly identifies a different visible control after a mis-targeted click, verify that corrected target and allow one corrected copy click; record both outcomes. Do not repeat after that correction.

Stop on login, CAPTCHA, anti-abuse `rate-limit`, `unusual-activity`, account restriction, permission, `ambiguous-control`, or `selector-drift` states. Never call private endpoints, replay network requests, inspect cookies, local storage, session storage, or hidden auth data, and never use background, scheduled, Dockerized, headless, parallel, proxy, stealth, CAPTCHA-solving, or anti-detection execution.
