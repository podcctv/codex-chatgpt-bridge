# ChatGPT Model and Reasoning Selection

For the default request, use **GPT-6** with reasoning effort **High**. The model and effort are separate settings and require separate visible evidence.

1. Find the composer-right control whose visible label shows the current effort, such as `Instant`, `Medium`, or `High`; click that control.
2. In the effort menu, select `High`. Confirm the composer-right control now displays `High`.
3. Click the displayed `High` control to open the model menu, then select `GPT-6`.
4. Verify the model menu shows `GPT-6` checked and independently verify the composer-right effort control still displays `High`. A `High` label proves effort only; it does not prove the model.
5. Immediately before sending, recheck both controls. After the response, verify both again and record `model_selector_observed` and `effort_control_observed` separately, with preflight and postflight visibility for each.

If the visible UI uses a different layout, use its explicit labels and selected-state indicators. Do not infer a model from the effort menu, a previous conversation, screenshots from another run, or the assistant's own claim. If either requested choice is missing or ambiguous, stop with `NEEDS_MODEL_SELECTION`. A model or effort explicitly requested for this task takes precedence over the defaults.
