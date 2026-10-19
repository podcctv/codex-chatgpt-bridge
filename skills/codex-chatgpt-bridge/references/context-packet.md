# Context Packet Contract

Use this exact order and markers:

```markdown
BEGIN_CONTEXT_PACKET
packet_id: <unique-local-id>
requested_reasoner: <visible model required by the user; GPT-6 if unspecified>
requested_effort: <visible reasoning effort required by the user; High if unspecified>
operating_mode: NORMAL
route: ROUTE_CHATGPT_REASONING
permission_level: L0_NO_TOOL
tools_available: none

## Objective
<one decision or problem>

## Acceptance
- <observable outcome>

## Repository State
- <branch, dirty state, relevant runtime facts>

## Evidence
- <file:symbol or command result plus concise fact>

## Constraints
- <compatibility, scope, approval, privacy boundaries>

## Access Boundary
- Allowed: analyze this packet and return the requested contract.
- Forbidden: claim repository access, browse for more context, use tools, edit files, or take external actions.

## Tool Budget
- ChatGPT tools: none.
- Response turns: one contract only. If the response is incomplete or invalid, stop and report the validation errors; do not send a repair turn or retry.

## Questions
1. <focused question for deep reasoning>
END_CONTEXT_PACKET
```

Choose the operating mode and route using [router-policy.md](router-policy.md). The only permitted access level for this packet transport is `L0_NO_TOOL`; local bridge permission levels do not apply to this browser handoff. Prioritize objective, acceptance, decisive evidence, and constraints. Remove history and implementation detail that do not change the decision. Keep paths and symbols when they let Codex verify the answer later. Mark unavailable facts as unknown; do not infer them.

Target 1–3K approximate tokens. A smaller packet is valid when complete. Split unrelated decisions into separate handoffs rather than exceeding 3K.
