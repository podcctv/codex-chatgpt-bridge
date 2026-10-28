#!/usr/bin/env node

import { realpathSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { lstat, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { consentStatus, defaultConsentPath } from './automation-consent.mjs';

const currentFile = fileURLToPath(import.meta.url);
const defaultSkillRoot = dirname(dirname(currentFile));
const minimumNodeMajor = 18;
const browserTransports = new Map([
  ['bundled-browser', 'browser:control-in-app-browser'],
  ['cua-repl-iab', 'mcp__cua_repl (iab)'],
]);
const acceptedBrowserCapabilities = new Set([...browserTransports.keys(), 'unavailable']);

const requiredFiles = [
  ['skill', 'SKILL.md'],
  ['interface', 'agents/openai.yaml'],
  ['local_bridge', 'scripts/local_bridge.ps1'],
  ['bridge_controller', 'scripts/bridge_controller.ps1'],
  ['restart_task', 'scripts/restart_task.ps1'],
  ['cf_config', 'scripts/set_cf_api_config.ps1'],
  ['validator', 'scripts/validate-handoff.mjs'],
  ['automation_consent', 'scripts/automation-consent.mjs'],
  ['automation_disclosure', 'references/automation-disclosure.md'],
  ['skill_doctor', 'scripts/skill-doctor.mjs'],
  ['bridge_operations', 'references/bridge-operations.md'],
  ['router_policy', 'references/router-policy.md'],
  ['hook_design', 'references/hook-design.md'],
  ['examples', 'references/examples.md'],
  ['agents_snippet', 'references/agents-snippet.md'],
  ['browser_transport', 'references/browser-transport.md'],
  ['computer_use', 'references/computer-use.md'],
  ['model_selection', 'references/model-selection.md'],
  ['context_packet', 'references/context-packet.md'],
  ['reasoning_request', 'references/reasoning-request.md'],
  ['run_receipt', 'references/run-receipt.md'],
  ['doctor_guide', 'references/skill-doctor.md'],
  ['regression_tests', 'tests/bridge-regression.test.mjs'],
];

async function fileCheck(skillRoot, id, relativePath) {
  try {
    const path = join(skillRoot, relativePath);
    const info = await lstat(path);
    if (!info.isFile()) return { id, path: relativePath, ok: false, reason: 'not a regular file' };
    await readFile(path);
    return { id, path: relativePath, ok: true };
  } catch (error) {
    return { id, path: relativePath, ok: false, reason: error.code ?? 'unreadable' };
  }
}

async function hashFile(path) {
  return createHash('sha256').update(await readFile(path)).digest('hex');
}

async function compareSkillRoots(skillRoot, compareRoot) {
  const differences = [];
  for (const [, relativePath] of requiredFiles) {
    try {
      const [skillHash, compareHash] = await Promise.all([
        hashFile(join(skillRoot, relativePath)),
        hashFile(join(compareRoot, relativePath)),
      ]);
      if (skillHash !== compareHash) {
        differences.push({ path: relativePath, skill_sha256: skillHash, compare_sha256: compareHash });
      }
    } catch (error) {
      differences.push({ path: relativePath, error: error.code ?? 'unreadable' });
    }
  }
  return differences;
}

export async function inspectInstallation(
  skillRoot = defaultSkillRoot,
  compareRoot = undefined,
  {
    browserCapability = 'unknown',
    consentStateFile = defaultConsentPath(),
  } = {},
) {
  const normalizedRoot = resolve(skillRoot);
  const checks = await Promise.all(
    requiredFiles.map(([id, relativePath]) => fileCheck(normalizedRoot, id, relativePath)),
  );

  let skillName = null;
  if (checks.find((check) => check.id === 'skill')?.ok) {
    const skill = await readFile(join(normalizedRoot, 'SKILL.md'), 'utf8');
    skillName = skill.match(/^name:\s*([a-z0-9-]+)$/m)?.[1] ?? null;
  }

  checks.push({
    id: 'skill_name',
    path: 'SKILL.md#name',
    ok: skillName === 'codex-chatgpt-bridge',
  });

  const nodeMajor = Number.parseInt(process.versions.node.split('.')[0], 10);
  const runtimeReady = Number.isInteger(nodeMajor) && nodeMajor >= minimumNodeMajor;
  checks.push({
    id: 'node_runtime',
    path: `node>=${minimumNodeMajor}`,
    ok: runtimeReady,
  });

  let comparison = null;
  if (compareRoot) {
    const normalizedCompareRoot = resolve(compareRoot);
    const differences = await compareSkillRoots(normalizedRoot, normalizedCompareRoot);
    comparison = {
      root: normalizedCompareRoot,
      compared_files: requiredFiles.length,
      differences,
    };
    checks.push({
      id: 'skill_copy_consistency',
      path: normalizedCompareRoot,
      ok: differences.length === 0,
      differences,
    });
  }

  const installationStatus = !runtimeReady
    ? 'MISSING_RUNTIME'
    : checks.every((check) => check.ok)
      ? 'READY'
      : 'INVALID_INSTALLATION';
  const transport = browserTransports.get(browserCapability) ?? null;
  const browserCapabilityReport = {
    status: transport ? 'READY' : 'NEEDS_BROWSER',
    transport,
    source: browserCapability === 'unknown' ? 'not provided' : 'runtime inventory argument',
    recovery: transport ? [] : [
      '`browser:control-in-app-browser` is supplied by the first-party bundled Browser plugin; it is not a standalone public Skill Installer package.',
      'In ChatGPT desktop for macOS or Windows, update the app, enable/open its built-in Browser for Work or Codex, then start a fresh task so the capability is reloaded.',
      'If this task runtime exposes the first-party `mcp__cua_repl` tool and its API supports `type: "iab"`, pass `--browser-capability cua-repl-iab`.',
      'Native Windows control through the `computer-use` Skill or `@oai/sky` is not an in-app Browser capability; see `references/computer-use.md`.',
      'Do not substitute Chrome, Edge, an extension, a direct API, or another ordinary browser.',
    ],
  };
  const browserAutomationConsent = await consentStatus(
    consentStateFile,
    join(normalizedRoot, 'references', 'automation-disclosure.md'),
  );
  const status = installationStatus !== 'READY'
    ? installationStatus
    : browserCapabilityReport.status !== 'READY'
      ? browserCapabilityReport.status
      : browserAutomationConsent.status !== 'RISK_ACKNOWLEDGED'
        ? browserAutomationConsent.status
        : 'READY';

  return {
    schema_version: 2,
    status,
    installation_status: installationStatus,
    skill_name: skillName,
    platform: process.platform,
    node: process.versions.node,
    minimum_node_major: minimumNodeMajor,
    checks,
    browser_capability: browserCapabilityReport,
    comparison,
    browser_automation_consent: browserAutomationConsent,
  };
}

function parseArgs(argv) {
  const options = {
    json: false,
    skillRoot: defaultSkillRoot,
    compareRoot: undefined,
    consentStateFile: defaultConsentPath(),
    browserCapability: 'unknown',
  };
  const seen = new Set();
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--json') {
      if (seen.has(argument)) throw new Error(`duplicate argument: ${argument}`);
      seen.add(argument);
      options.json = true;
      continue;
    }
    if (['--skill-root', '--compare-root', '--browser-capability', '--consent-state-file'].includes(argument)) {
      if (seen.has(argument)) throw new Error(`duplicate argument: ${argument}`);
      if (!argv[index + 1] || argv[index + 1].startsWith('--')) {
        throw new Error(`missing value for ${argument}`);
      }
      seen.add(argument);
    }
    if (argument === '--skill-root') {
      options.skillRoot = argv[index + 1];
      index += 1;
      continue;
    }
    if (argument === '--compare-root') {
      options.compareRoot = argv[index + 1];
      index += 1;
      continue;
    }
    if (argument === '--consent-state-file') {
      options.consentStateFile = argv[index + 1];
      index += 1;
      continue;
    }
    if (argument === '--browser-capability') {
      const value = argv[index + 1];
      if (!acceptedBrowserCapabilities.has(value)) {
        throw new Error(`invalid value for --browser-capability: ${value}`);
      }
      options.browserCapability = value;
      index += 1;
      continue;
    }
    throw new Error(`unknown or incomplete argument: ${argument}`);
  }
  return options;
}

async function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`usage: skill-doctor.mjs [--json] [--skill-root <path>] [--compare-root <path>] [--consent-state-file <path>] [--browser-capability <bundled-browser|cua-repl-iab|unavailable>]\n${error.message}`);
    process.exitCode = 2;
    return;
  }

  const result = await inspectInstallation(options.skillRoot, options.compareRoot, {
    browserCapability: options.browserCapability,
    consentStateFile: options.consentStateFile,
  });
  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`Codex bridge browser route Doctor: ${result.status}`);
    console.log(`Installation: ${result.installation_status}`);
    for (const check of result.checks) {
      console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.id}: ${check.path}`);
      for (const difference of check.differences ?? []) {
        console.log(`  DIFF ${difference.path}${difference.error ? ` (${difference.error})` : ''}`);
      }
    }
    console.log(`Browser capability: ${result.browser_capability.status} (${result.browser_capability.transport ?? result.browser_capability.source})`);
    for (const instruction of result.browser_capability.recovery) console.log(`  ACTION ${instruction}`);
    console.log(`Risk acknowledgement: ${result.browser_automation_consent.status} (scope: ${result.browser_automation_consent.decision_scope})`);
  }
  process.exitCode = result.status === 'READY' ? 0 : 1;
}

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(currentFile)) {
  await main();
}
