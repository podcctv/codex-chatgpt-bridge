# ChatGPT Model and Reasoning Selection

For the default request, use **GPT-6** with reasoning effort **High**. Model selection, reasoning effort, and model availability are separate facts and need separate visible checks.

## Current in-app Browser composer layout

1. Inspect a fresh screenshot and accessibility tree. Find the composer-right control showing the current effort, such as `Instant`, `Medium`, or `High`; do not trust its accessibility description by itself.
2. Open the control and set or verify `High` in the effort popover. Confirm the composer-right control still visibly displays `High`.
3. In the current layout, the first click on the generic `选择 ChatGPT 模型` control can open a popover that shows only the High slider. This is the effort layer, not yet the model list. Click the visible `High ›` label at the top of that popover to expand the model submenu; do not click the slider track expecting it to choose a model.
4. Inspect the expanded menu. Verify the requested model name is visibly selected (for example, a checkmark beside `GPT-6`), and corroborate that with the fresh accessibility tree's selected state (for example, `GPT-6, Value: 1`). Refresh the tree after each action before reusing element indices. A generic menu label or the effort slider does not prove model identity.
5. Independently verify the composer-right effort still displays `High`. The model row proves identity; the effort control proves effort.
6. Check availability separately. If the selected model row is locked/disabled or the UI reports that the usage limit/cooldown has been reached, record that the model is selected but unavailable and classify the run as `NEEDS_MODEL_AVAILABILITY`. Do not submit the packet, retry, work around the limit, or silently switch models. If the requested model is absent or not selected and there is no availability blocker, classify it as `NEEDS_MODEL_SELECTION`.
7. Immediately before sending, recheck selected model, effort, and usability. After a completed response, verify model and effort again; record them separately in the receipt, and note the visible preflight availability state (no blocker) in the local UI summary. Never record a blocked selection as usable.

If the visible UI uses a different layout, follow its explicit rendered labels and selected-state indicators, not remembered coordinates. Do not infer a model from the effort menu, a previous conversation, account defaults, screenshots from another run, or the assistant's own claim. If the requested model or effort is missing or ambiguous, stop with `NEEDS_MODEL_SELECTION`; if selected but visibly blocked, stop with `NEEDS_MODEL_AVAILABILITY`. A model or effort explicitly requested for this task takes precedence over the defaults.
