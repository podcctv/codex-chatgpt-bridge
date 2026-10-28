# Computer Use Routing and Troubleshooting

Keep browser automation, native desktop control, and local shell work on their documented interfaces. Availability of one surface does not prove another is available.

| Task | Use | Does not substitute for |
|---|---|---|
| ChatGPT web handoff | First-party in-app Browser with a live `type: "iab"` capability | Native desktop control, ordinary Chrome/Edge, extensions, or direct APIs |
| Windows native app UI | Follow the installed `computer-use` Skill; on this host its Windows path uses `@oai/sky` through `mcp__node_repl__js` | The in-app Browser capability |
| Files, scripts, diagnostics | Local CLI or purpose-built file tools | UI automation |

## First-party Browser

Read the current `mcp__cua_repl` documentation, then inspect `await cua.getState()` and use only a browser listed there with `type: "iab"`. Browser IDs and tab IDs are runtime values; never hard-code them. A working native-app inventory or an open ChatGPT tab in another browser does not satisfy the Browser gate.

Use the APIs documented by the selected surface. The `cua_repl` wrapper supports `getState`, `getBrowser`, `listTabs`, `getTab`, and `createBrowserTab`; its tab may expose accessibility actions or a DOM-only Playwright interface. For a DOM-only tab, `getAXState()` has no numeric element indexes and the native `click`/`paste`/`pressKey` wrappers can fail before input. Use documented Playwright locators from a fresh DOM snapshot. Reuse the selected browser when a tab is missing; an empty tab list is normal and does not mean the browser disconnected.

Do not invent a locator `.hover()` method. If the current API documents hover, use it to verify the response action tooltip (`复制回复`, not `分享`). If hover is unavailable, use the current assistant response's observed accessible name/title and action-row context. Do not choose by icon order or stale element index. Stop if the control cannot be distinguished safely.

Read copied output only through the selected Browser surface's documented browser-session clipboard API (for Browser Use, `tab.clipboard.readText()` when exposed). The generic `cua_repl` tab wrapper does not promise that clipboard method. Never substitute Windows `Get-Clipboard`, another app's clipboard, DOM/page-text extraction, `navigator.clipboard` inspection, or an invented API. If the selected interface cannot read its own clipboard, or returns empty text after a visible copy, stop and report the handoff as incomplete; do not reconstruct the answer from the page.

## Native Windows apps

When the installed `computer-use` Skill specifies `@oai/sky` through `mcp__node_repl__js`, use that interface for native desktop apps and read its packaged guidance before acting. Its read-only inventory can be initialized as follows:

```javascript
if (!globalThis.sky) {
  const { sky } = await import('@oai/sky');
  globalThis.sky = sky;
}
const apps = await sky.list_apps();
```

Select only an exact window ID returned by the current inventory. Re-observe after actions and use fresh screenshot/AX evidence for subsequent input. Do not guess window handles or launch helper executables. A successful native-app probe proves only that native UI interface works; it does not prove an in-app Browser, ChatGPT login, or browser clipboard access.

Do not use native desktop control to automate ChatGPT desktop UI, enter credentials, bypass security prompts, or work around Browser access restrictions. Follow the installed Computer Use Skill's confirmation and handoff rules for consequential UI actions.

## Diagnose the layer that failed

- **No `iab` entry in current inventory**: report `NEEDS_BROWSER`; do not pass native-app availability as a Browser capability.
- **Tab missing or stale**: refresh the same Browser inventory and bind/create a fresh tab; do not reselect or switch to an ordinary browser just to recover it.
- **Locator has no accessible role/name**: take a fresh DOM snapshot or screenshot, then use only the documented action for that surface. Do not invent methods.
- **Clipboard read is empty or unsupported**: stop without reading ChatGPT response text from DOM or OS clipboard.
- **Localhost/network error in a test page**: check the test listener and the selected Browser surface independently. A sandbox socket denial is a runtime/network restriction, not evidence that an unrelated computer-use API is broken. Do not bypass origin, site, or user permission controls.
