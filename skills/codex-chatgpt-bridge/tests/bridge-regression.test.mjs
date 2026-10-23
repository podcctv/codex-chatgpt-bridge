import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import {
  estimateTokens,
  receiptCompletionErrors,
  validatePacket,
  validateReceipt,
  verifyReceiptArtifacts,
} from '../scripts/validate-handoff.mjs';
import { inspectInstallation } from '../scripts/skill-doctor.mjs';
import {
  consentStatus,
  defaultConsentPath,
  RISK_ACKNOWLEDGEMENT,
  writeConsentDecision,
} from '../scripts/automation-consent.mjs';

const skillRoot = fileURLToPath(new URL('../', import.meta.url));
const doctorPath = join(skillRoot, 'scripts', 'skill-doctor.mjs');
const consentPath = join(skillRoot, 'scripts', 'automation-consent.mjs');
const validatorPath = join(skillRoot, 'scripts', 'validate-handoff.mjs');

test('model selection drills through High and only explicit availability notices block', async () => {
  const selectionGuide = await readFile(join(skillRoot, 'references', 'model-selection.md'), 'utf8');
  const transportGuide = await readFile(join(skillRoot, 'references', 'browser-transport.md'), 'utf8');
  const doctorGuide = await readFile(join(skillRoot, 'references', 'skill-doctor.md'), 'utf8');
  assert.match(selectionGuide, /visible `High ›` label/);
  assert.match(selectionGuide, /GPT-6, Value: 1/);
  assert.match(selectionGuide, /Only classify the model as `NEEDS_MODEL_AVAILABILITY` if the visible UI explicitly marks the selected row locked\/disabled or displays a usage-limit\/cooldown notice/);
  assert.match(selectionGuide, /If no such notice is visible, treat it as no reported blocker and continue normally/);
  assert.doesNotMatch(selectionGuide, /recheck selected model, effort, and usability/i);
  assert.match(transportGuide, /Availability handling is notice-driven, not a separate inferred check/);
  assert.match(doctorGuide, /if no such notice is visible, proceed through the normal handoff flow without a separate availability check/i);
});

test('default consent storage is scoped to the unified skill directory', () => {
  const path = defaultConsentPath({ CODEX_HOME: 'C:\\codex-home' });
  assert.ok(path.endsWith(join('codex-chatgpt-bridge', 'automation-consent.json')));
  assert.ok(!path.includes('codex-bridge-chatgpt'));
});

const packetText = `BEGIN_CONTEXT_PACKET
packet_id: regression-001
requested_reasoner: GPT-6
requested_effort: High
operating_mode: NORMAL
route: ROUTE_CHATGPT_REASONING
permission_level: L0_NO_TOOL
tools_available: none

## Objective
Validate the bridge contract.

## Acceptance
The receipt must be bound to the submitted artifacts.

## Repository State
Temporary fixture only.

## Evidence
This is synthetic test data.

## Constraints
No external actions.

## Access Boundary
No tools.

## Tool Budget
None.

## Questions
Does the contract pass?
END_CONTEXT_PACKET
`;

const resultText = `BEGIN_REASONING_RESULT

packet_id: regression-001

## Verdict
The synthetic fixture is internally consistent.

## Assumptions
Only this test fixture is in scope.

## Evidence Used
The generated packet and receipt.

## Proposed Changes
None.

## Tests
The local regression test is running.

## Risks
No external state is touched.

## Unknowns
None for this fixture.
END_REASONING_RESULT
`;

test('packet contract requires a visible model and reasoning effort request', () => {
  assert.deepEqual(validatePacket(packetText), []);
  const missingEffort = packetText.replace('requested_effort: High\n', '');
  assert.ok(validatePacket(missingEffort).some((error) => error.includes('requested_effort')));
});

function digest(text) {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

async function tempDirectory(t) {
  const path = await mkdtemp(join(tmpdir(), 'codex-bridge-regression-'));
  t.after(() => rm(path, { recursive: true, force: true }));
  return path;
}

async function makeRun(root) {
  await mkdir(root, { recursive: true });
  const browserEvidence = 'Synthetic visible-state evidence for test purposes.\n';
  await writeFile(join(root, 'packet.md'), packetText, 'utf8');
  await writeFile(join(root, 'result.md'), resultText, 'utf8');
  await writeFile(join(root, 'browser-evidence.md'), browserEvidence, 'utf8');
  const receipt = {
    schema_version: 3,
    packet_id: 'regression-001',
    artifacts: {
      packet: { path: 'packet.md', sha256: digest(packetText), approximate_tokens: estimateTokens(packetText) },
      result: { path: 'result.md', sha256: digest(resultText) },
      browser_evidence: { path: 'browser-evidence.md', sha256: digest(browserEvidence) },
    },
    codex_model: { requested: 'test model', observed: 'test model', status: 'verified', evidence: 'synthetic test' },
    chatgpt_model: {
      requested: 'GPT-6', requested_effort: 'High', observed_model: 'GPT-6', observed_effort: 'High', status: 'verified',
      evidence_model: 'Model selector visibly shows GPT-6.', evidence_effort: 'Thinking-effort control visibly shows High.',
      preflight_model_visible: true, preflight_effort_visible: true,
      postflight_model_visible: true, postflight_effort_visible: true,
    },
    privacy_review: {
      scope_minimized: true, credentials_scan_passed: true, semantic_privacy_reviewed: true,
      raw_diff_excluded: true, unrelated_files_excluded: true,
    },
    browser_transport: 'verified',
    packet_validation: 'passed',
    result_validation: 'passed',
    pair_validation: 'passed',
    local_revalidation: 'passed',
    adoption: { status: 'passed', accepted: [], rejected: [], deferred: [], local_evidence: [] },
    local_changes: { status: 'no_changes_needed', reason: 'Synthetic test fixture.' },
    tests: 'passed',
  };
  return receipt;
}

test('complete receipt accepts matching, semantically valid artifacts', async (t) => {
  const root = join(await tempDirectory(t), 'run');
  const receipt = await makeRun(root);
  assert.deepEqual(receiptCompletionErrors(receipt), []);
  assert.deepEqual(await verifyReceiptArtifacts(receipt, root), []);
});

test('verified ChatGPT selection requires separate exact model and effort evidence', async (t) => {
  const root = join(await tempDirectory(t), 'run');
  const receipt = await makeRun(root);
  receipt.chatgpt_model.observed_model = 'GPT-6 / High';
  assert.ok(validateReceipt(receipt).some((error) => error.includes('observed_model must match the requested model exactly')));

  receipt.chatgpt_model.observed_model = 'GPT-6';
  receipt.chatgpt_model.observed_effort = 'Medium';
  assert.ok(validateReceipt(receipt).some((error) => error.includes('observed_effort must match the requested effort exactly')));

  receipt.chatgpt_model.observed_effort = 'High';
  receipt.chatgpt_model.postflight_model_visible = false;
  assert.ok(receiptCompletionErrors(receipt).some((error) => error.includes('postflight_model_visible')));
});

test('legacy combined-selection receipts remain readable but cannot be marked complete', async (t) => {
  const root = join(await tempDirectory(t), 'run');
  const receipt = await makeRun(root);
  receipt.schema_version = 2;
  receipt.chatgpt_model = {
    requested: 'GPT-6', requested_effort: 'High', observed: 'GPT-6 / High', status: 'verified',
    evidence: 'Legacy combined selection note.', preflight_visible: true, postflight_visible: true,
  };
  assert.deepEqual(validateReceipt(receipt), []);
  assert.ok(receiptCompletionErrors(receipt).some((error) => error.includes('requires schema_version 3')));
});

test('complete CLI resolves an explicit artifact root independently of its working directory', async (t) => {
  const root = join(await tempDirectory(t), 'run');
  const receipt = await makeRun(root);
  const receiptPath = join(root, 'receipt.json');
  await writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');

  const explicitRoot = spawnSync(process.execPath, [
    validatorPath, 'complete', receiptPath, '--artifact-root', root,
  ], { cwd: tmpdir(), encoding: 'utf8' });
  assert.equal(explicitRoot.status, 0, explicitRoot.stderr);
  assert.match(explicitRoot.stdout, /OK: valid complete/);

  const cwdDefault = spawnSync(process.execPath, [validatorPath, 'complete', receiptPath], {
    cwd: root,
    encoding: 'utf8',
  });
  assert.equal(cwdDefault.status, 0, cwdDefault.stderr);
});

test('complete receipt rejects semantically invalid result even with a matching new hash', async (t) => {
  const root = join(await tempDirectory(t), 'run');
  const receipt = await makeRun(root);
  const invalidResult = resultText.replace('## Verdict', '## Outcome');
  await writeFile(join(root, 'result.md'), invalidResult, 'utf8');
  receipt.artifacts.result.sha256 = digest(invalidResult);

  const errors = await verifyReceiptArtifacts(receipt, root);
  assert.ok(errors.some((error) => error.includes('result: missing required section: ## Verdict')));
});

test('complete receipt rejects Packet ID and token-count mismatches', async (t) => {
  const root = join(await tempDirectory(t), 'run');
  const receipt = await makeRun(root);
  const changedPacket = packetText.replace('regression-001', 'regression-002');
  await writeFile(join(root, 'packet.md'), changedPacket, 'utf8');
  receipt.artifacts.packet.sha256 = digest(changedPacket);

  let errors = await verifyReceiptArtifacts(receipt, root);
  assert.ok(errors.some((error) => error.includes('packet_id mismatch')));
  assert.ok(errors.some((error) => error.includes('receipt packet_id mismatch')));

  await writeFile(join(root, 'packet.md'), packetText, 'utf8');
  receipt.artifacts.packet.sha256 = digest(packetText);
  receipt.artifacts.packet.approximate_tokens += 1;
  errors = await verifyReceiptArtifacts(receipt, root);
  assert.ok(errors.some((error) => error.includes('packet approximate_tokens mismatch')));
});

test('complete receipt rejects a hash mismatch on otherwise valid browser evidence', async (t) => {
  const root = join(await tempDirectory(t), 'run');
  const receipt = await makeRun(root);
  await writeFile(join(root, 'browser-evidence.md'), 'changed evidence\n', 'utf8');
  const errors = await verifyReceiptArtifacts(receipt, root);
  assert.ok(errors.some((error) => error.includes('browser_evidence sha256 mismatch')));
});

test('complete receipt rejects traversal, absolute outside paths, missing paths, and directories', async (t) => {
  const base = await tempDirectory(t);
  const root = join(base, 'run');
  const receipt = await makeRun(root);
  const outside = join(base, 'outside.md');
  await writeFile(outside, 'outside artifact\n', 'utf8');

  receipt.artifacts.browser_evidence.path = '../outside.md';
  receipt.artifacts.browser_evidence.sha256 = digest('outside artifact\n');
  let errors = await verifyReceiptArtifacts(receipt, root);
  assert.ok(errors.some((error) => error.includes('resolves outside the artifact root')));

  receipt.artifacts.browser_evidence.path = outside;
  errors = await verifyReceiptArtifacts(receipt, root);
  assert.ok(errors.some((error) => error.includes('resolves outside the artifact root')));

  receipt.artifacts.browser_evidence.path = '';
  errors = await verifyReceiptArtifacts(receipt, root);
  assert.ok(errors.some((error) => error.includes('artifact path is missing or invalid')));

  await mkdir(join(root, 'directory-target'));
  receipt.artifacts.browser_evidence.path = 'directory-target';
  errors = await verifyReceiptArtifacts(receipt, root);
  assert.ok(errors.some((error) => error.includes('not a regular file')));
});

test('complete receipt rejects a symlink that resolves outside its artifact root', async (t) => {
  const base = await tempDirectory(t);
  const root = join(base, 'run');
  const receipt = await makeRun(root);
  const outside = join(base, 'outside.md');
  const link = join(root, 'evidence-link.md');
  await writeFile(outside, 'outside artifact\n', 'utf8');
  try {
    await symlink(outside, link, 'file');
  } catch (error) {
    if (['EPERM', 'EACCES', 'UNKNOWN'].includes(error.code)) {
      t.skip(`symlink creation unavailable on this host: ${error.code}`);
      return;
    }
    throw error;
  }
  receipt.artifacts.browser_evidence.path = 'evidence-link.md';
  receipt.artifacts.browser_evidence.sha256 = digest('outside artifact\n');
  const errors = await verifyReceiptArtifacts(receipt, root);
  assert.ok(errors.some((error) => error.includes('resolves outside the artifact root')));
});

test('Doctor reports identical copies READY and names controlled-file drift', async (t) => {
  const copyRoot = join(await tempDirectory(t), 'skill-copy');
  await cp(skillRoot, copyRoot, { recursive: true });
  const consentStateFile = join(copyRoot, 'consent-state.json');
  await writeConsentDecision(consentStateFile, true, undefined, join(skillRoot, 'references', 'automation-disclosure.md'));
  let report = await inspectInstallation(skillRoot, copyRoot, {
    browserCapability: 'cua-repl-iab',
    consentStateFile,
  });
  assert.equal(report.status, 'READY');
  assert.equal(report.installation_status, 'READY');
  assert.equal(report.comparison.differences.length, 0);
  assert.equal(report.browser_automation_consent.status, 'RISK_ACKNOWLEDGED');

  report = await inspectInstallation(skillRoot, undefined, { consentStateFile });
  assert.equal(report.status, 'NEEDS_BROWSER');
  assert.equal(report.installation_status, 'READY');

  const disabledStateFile = join(copyRoot, 'disabled-consent-state.json');
  await writeConsentDecision(disabledStateFile, false);
  report = await inspectInstallation(skillRoot, undefined, {
    browserCapability: 'cua-repl-iab',
    consentStateFile: disabledStateFile,
  });
  assert.equal(report.status, 'AUTOMATION_DISABLED');
  assert.equal(report.browser_automation_consent.status, 'AUTOMATION_DISABLED');

  const doctorGuide = join(copyRoot, 'references', 'skill-doctor.md');
  await writeFile(doctorGuide, `${await readFile(doctorGuide, 'utf8')}\nDrift fixture.\n`, 'utf8');
  report = await inspectInstallation(skillRoot, copyRoot, {
    browserCapability: 'cua-repl-iab',
    consentStateFile,
  });
  const consistencyCheck = report.checks.find((check) => check.id === 'skill_copy_consistency');
  assert.equal(report.status, 'INVALID_INSTALLATION');
  assert.ok(consistencyCheck.differences.some((difference) => difference.path === 'references/skill-doctor.md'));
});

test('Doctor CLI requires runtime Browser evidence and risk acknowledgement for browser-route READY', async (t) => {
  const root = await tempDirectory(t);
  const consentStateFile = join(root, 'consent-state.json');
  await writeConsentDecision(consentStateFile, true);

  const missingCapability = spawnSync(process.execPath, [
    doctorPath, '--json', '--consent-state-file', consentStateFile,
  ], { encoding: 'utf8' });
  assert.equal(missingCapability.status, 1);
  const blocked = JSON.parse(missingCapability.stdout);
  assert.equal(blocked.status, 'NEEDS_BROWSER');
  assert.equal(blocked.installation_status, 'READY');

  const ready = spawnSync(process.execPath, [
    doctorPath,
    '--json',
    '--browser-capability', 'cua-repl-iab',
    '--consent-state-file', consentStateFile,
  ], { encoding: 'utf8' });
  assert.equal(ready.status, 0, ready.stderr || ready.stdout);
  const report = JSON.parse(ready.stdout);
  assert.equal(report.status, 'READY');
  assert.equal(report.browser_capability.transport, 'mcp__cua_repl (iab)');
  assert.equal(report.browser_automation_consent.status, 'RISK_ACKNOWLEDGED');
  assert.equal(report.browser_automation_consent.current_task_authorization_required, true);
});

test('Doctor rejects required paths that are directories and invalid option values', async (t) => {
  const copyRoot = join(await tempDirectory(t), 'skill-copy');
  await cp(skillRoot, copyRoot, { recursive: true });
  await rm(join(copyRoot, 'SKILL.md'));
  await mkdir(join(copyRoot, 'SKILL.md'));
  const report = await inspectInstallation(copyRoot);
  assert.equal(report.status, 'INVALID_INSTALLATION');
  assert.equal(report.checks.find((check) => check.id === 'skill')?.reason, 'not a regular file');

  const missingOptionValue = spawnSync(process.execPath, [doctorPath, '--compare-root', '--json'], { encoding: 'utf8' });
  assert.equal(missingOptionValue.status, 2);
  assert.match(missingOptionValue.stderr, /missing value for --compare-root/);

  const duplicateOption = spawnSync(process.execPath, [doctorPath, '--json', '--json'], { encoding: 'utf8' });
  assert.equal(duplicateOption.status, 2);
  assert.match(duplicateOption.stderr, /duplicate argument: --json/);

  const invalidBrowserCapability = spawnSync(process.execPath, [doctorPath, '--browser-capability', 'chrome', '--json'], { encoding: 'utf8' });
  assert.equal(invalidBrowserCapability.status, 2);
  assert.match(invalidBrowserCapability.stderr, /invalid value for --browser-capability/);
});

test('consent remains isolated to the test state file and requires the exact acknowledgement', async (t) => {
  const stateRoot = await mkdtemp(join(skillRoot, 'tests', '.consent-state-'));
  t.after(() => rm(stateRoot, { recursive: true, force: true }));
  const stateFile = join(stateRoot, 'automation-consent.json');
  assert.equal((await consentStatus(stateFile)).status, 'NEEDS_AUTOMATION_CONSENT');

  const rejected = spawnSync(process.execPath, [
    consentPath, 'enable', '--state-file', stateFile, '--acknowledge-risk', 'wrong', '--json',
  ], { encoding: 'utf8' });
  assert.equal(rejected.status, 2);
  assert.equal(JSON.parse(rejected.stdout).status, 'ACKNOWLEDGEMENT_REQUIRED');
  assert.equal((await consentStatus(stateFile)).status, 'NEEDS_AUTOMATION_CONSENT');

  const enabled = spawnSync(process.execPath, [
    consentPath, 'enable', '--state-file', stateFile, '--acknowledge-risk', RISK_ACKNOWLEDGEMENT, '--json',
  ], { encoding: 'utf8' });
  assert.equal(enabled.status, 0);
  assert.equal(JSON.parse(enabled.stdout).status, 'RISK_ACKNOWLEDGED');
  const acknowledged = await consentStatus(stateFile);
  assert.equal(acknowledged.risk_acknowledged, true);
  assert.equal(acknowledged.decision_scope, 'risk_acknowledgement_only');
  assert.equal(acknowledged.current_task_authorization_required, true);

  const disabled = await writeConsentDecision(stateFile, false);
  assert.equal(disabled.status, 'AUTOMATION_DISABLED');
  assert.equal(disabled.risk_acknowledged, false);

  await writeFile(stateFile, JSON.stringify({
    schema_version: 1,
    disclosure_version: 1,
    browser_automation_enabled: true,
    decided_at: new Date().toISOString(),
  }), 'utf8');
  const legacyEnabled = await consentStatus(stateFile);
  assert.equal(legacyEnabled.status, 'NEEDS_AUTOMATION_CONSENT');
  assert.equal(legacyEnabled.reason, 'legacy_state_not_migrated');
});

test('enabled consent is invalidated by any disclosure content change while disabled stays disabled', async (t) => {
  const stateRoot = await mkdtemp(join(skillRoot, 'tests', '.disclosure-hash-'));
  t.after(() => rm(stateRoot, { recursive: true, force: true }));
  const stateFile = join(stateRoot, 'automation-consent.json');
  const disclosureFile = join(stateRoot, 'automation-disclosure.md');
  await writeFile(disclosureFile, 'Risk disclosure version one.\n', 'utf8');

  const enabled = await writeConsentDecision(stateFile, true, undefined, disclosureFile);
  assert.equal(enabled.status, 'RISK_ACKNOWLEDGED');
  assert.match(JSON.parse(await readFile(stateFile, 'utf8')).disclosure_sha256, /^[a-f0-9]{64}$/);

  await writeFile(disclosureFile, 'Risk disclosure version one.\r\n', 'utf8');
  assert.equal((await consentStatus(stateFile, disclosureFile)).status, 'RISK_ACKNOWLEDGED');

  await rm(disclosureFile);
  const unavailable = await consentStatus(stateFile, disclosureFile);
  assert.equal(unavailable.status, 'NEEDS_AUTOMATION_CONSENT');
  assert.equal(unavailable.reason, 'disclosure_unavailable');

  await writeFile(disclosureFile, 'Risk disclosure version two.\n', 'utf8');
  const stale = await consentStatus(stateFile, disclosureFile);
  assert.equal(stale.status, 'NEEDS_AUTOMATION_CONSENT');
  assert.equal(stale.reason, 'stale_disclosure');

  const disabled = await writeConsentDecision(stateFile, false, undefined, disclosureFile);
  assert.equal(disabled.status, 'AUTOMATION_DISABLED');
  await rm(disclosureFile);
  assert.equal((await consentStatus(stateFile, disclosureFile)).status, 'AUTOMATION_DISABLED');
});
