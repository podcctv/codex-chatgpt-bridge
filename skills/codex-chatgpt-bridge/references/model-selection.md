# ChatGPT Model and Reasoning Selection

For the default request, use **GPT-6** with reasoning effort **High**. Verify model selection and reasoning effort separately.

## Current in-app Browser composer layout

1. Inspect a fresh screenshot and accessibility tree. Find the composer-right control showing the current effort, such as `Instant`, `Medium`, or `High`; do not trust its accessibility description by itself.
2. Open the control and set or verify `High` in the effort popover. Confirm the composer-right control still visibly displays `High`.
3. In the current layout, the first click on the generic `选择 ChatGPT 模型` control can open a popover that shows only the High slider. This is the effort layer, not yet the model list. Click the visible `High ›` label at the top of that popover to expand the model submenu; do not click the slider track expecting it to choose a model.
4. Inspect the expanded menu. Verify the requested model name is visibly selected (for example, a checkmark beside `GPT-6`), and corroborate that with the fresh accessibility tree's selected state (for example, `GPT-6, Value: 1`). Refresh the tree after each action before reusing element indices. A generic menu label or the effort slider does not prove model identity.
5. Independently verify the composer-right effort still displays `High`. The model row proves identity; the effort control proves effort.
6. Immediately before sending, recheck the selected model and effort. After a completed response, verify model and effort again and record them separately in the receipt.

If the visible UI uses a different layout, follow its explicit rendered labels and selected-state indicators, not remembered coordinates. Do not infer a model from the effort menu, a previous conversation, account defaults, screenshots from another run, or the assistant's own claim. If the requested model or effort is missing or ambiguous, stop with `NEEDS_MODEL_SELECTION`. A model or effort explicitly requested for this task takes precedence over the defaults.
