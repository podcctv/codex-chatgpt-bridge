#!/usr/bin/env node

import { realpathSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const CONSENT_SCHEMA_VERSION = 2;
export const RISK_ACKNOWLEDGEMENT = 'I_ACKNOWLEDGE_EXPERIMENTAL_BROWSER_RISK_V2';

const currentFile = fileURLToPath(import.meta.url);

export function defaultConsentPath(environment = process.env) {
  const codexHome = environment.CODEX_HOME?.trim() || join(homedir(), '.codex');
  return join(codexHome, 'codex-chatgpt-bridge', 'automation-consent.json');
}

export function defaultDisclosurePath() {
  return resolve(dirname(currentFile), '..', 'references', 'automation-disclosure.md');
}

async function disclosureDigest(disclosureFile = defaultDisclosurePath()) {
  const body = await readFile(resolve(disclosureFile));
  if (!body.toString('utf8').trim()) {
    const error = new Error('automation disclosure is empty');
    error.code = 'EMPTY_DISCLOSURE';
    throw error;
  }
  const normalizedDisclosure = body.toString('utf8').replace(/\r\n/g, '\n');
  return createHash('sha256').update(normalizedDisclosure, 'utf8').digest('hex');
}

export async function consentStatus(
  stateFile = defaultConsentPath(),
  disclosureFile = defaultDisclosurePath(),
) {
  let state;
  try {
    state = JSON.parse(await readFile(resolve(stateFile), 'utf8'));
  } catch (error) {
    return statusResult(error?.code === 'ENOENT' ? 'missing_state' : 'invalid_state');
  }

  if (Number.isInteger(state?.schema_version) && state.schema_version < CONSENT_SCHEMA_VERSION) {
    return statusResult('legacy_state_not_migrated');
  }
  if (!validStateShape(state)) return statusResult('invalid_state');
  if (!state.risk_acknowledged) {
    return statusResult('user_disabled', false, 'AUTOMATION_DISABLED');
  }
  let currentDisclosureDigest;
  try {
    currentDisclosureDigest = await disclosureDigest(disclosureFile);
  } catch {
    return statusResult('disclosure_unavailable');
  }
  if (state.disclosure_sha256 !== currentDisclosureDigest) {
    return statusResult('stale_disclosure');
  }
  return statusResult(undefined, true, 'RISK_ACKNOWLEDGED');
}

export async function writeConsentDecision(
  stateFile,
  riskAcknowledged,
  decidedAt = new Date().toISOString(),
  disclosureFile = defaultDisclosurePath(),
) {
  const target = resolve(stateFile);
  const disclosureSha256 = riskAcknowledged
    ? await disclosureDigest(disclosureFile)
    : null;
  const state = {
    schema_version: CONSENT_SCHEMA_VERSION,
    risk_acknowledged: riskAcknowledged,
    disclosure_sha256: disclosureSha256,
    decided_at: decidedAt,
  };
  const temporary = `${target}.tmp-${process.pid}-${Date.now()}`;

  await mkdir(dirname(target), { recursive: true, mode: 0o700 });
  try {
    await writeFile(temporary, `${JSON.stringify(state, null, 2)}\n`, {
      encoding: 'utf8',
      flag: 'wx',
      mode: 0o600,
    });
    await rename(temporary, target);
  } finally {
    await unlink(temporary).catch((error) => {
      if (error?.code !== 'ENOENT') throw error;
    });
  }

  return consentStatus(target, disclosureFile);
}

function validStateShape(state) {
  return state !== null
    && typeof state === 'object'
    && !Array.isArray(state)
    && state.schema_version === CONSENT_SCHEMA_VERSION
    && typeof state.risk_acknowledged === 'boolean'
    && (state.risk_acknowledged
      ? /^[a-f0-9]{64}$/.test(state.disclosure_sha256)
      : state.disclosure_sha256 === null)
    && typeof state.decided_at === 'string'
    && !Number.isNaN(Date.parse(state.decided_at));
}

function statusResult(
  reason,
  riskAcknowledged = null,
  status = 'NEEDS_AUTOMATION_CONSENT',
) {
  return {
    schema_version: CONSENT_SCHEMA_VERSION,
    status,
    risk_acknowledged: riskAcknowledged,
    decision_scope: 'risk_acknowledgement_only',
    current_task_authorization_required: true,
    reason: reason ?? null,
  };
}

function parseArgs(argv) {
  const command = argv[0];
  if (!['status', 'enable', 'disable'].includes(command)) {
    throw new Error('expected command: status, enable, or disable');
  }

  const options = {
    command,
    json: false,
    stateFile: defaultConsentPath(),
    acknowledgement: undefined,
  };
  for (let index = 1; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--json') {
      options.json = true;
      continue;
    }
    if (argument === '--state-file' && argv[index + 1]) {
      options.stateFile = argv[index + 1];
      index += 1;
      continue;
    }
    if (argument === '--acknowledge-risk' && argv[index + 1]) {
      options.acknowledgement = argv[index + 1];
      index += 1;
      continue;
    }
    throw new Error(`unknown or incomplete argument: ${argument}`);
  }
  return options;
}

function printResult(result, json) {
  if (json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  console.log(`Experimental browser risk acknowledgement: ${result.status}`);
  if (result.reason !== null) console.log(`Reason: ${result.reason}`);
}

async function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(
      'usage: automation-consent.mjs <status|enable|disable> [--json] '
      + '[--state-file <path>] [--acknowledge-risk <token>]\n'
      + error.message,
    );
    process.exitCode = 2;
    return;
  }

  if (options.command === 'enable' && options.acknowledgement !== RISK_ACKNOWLEDGEMENT) {
    const result = {
      ...statusResult('exact_acknowledgement_required'),
      status: 'ACKNOWLEDGEMENT_REQUIRED',
    };
    printResult(result, options.json);
    process.exitCode = 2;
    return;
  }

  let result;
  try {
    result = options.command === 'status'
      ? await consentStatus(options.stateFile)
      : await writeConsentDecision(options.stateFile, options.command === 'enable');
  } catch (error) {
    result = statusResult(
      error?.code === 'ENOENT' || error?.code === 'EMPTY_DISCLOSURE'
        ? 'disclosure_unavailable'
        : 'write_failed',
    );
    printResult(result, options.json);
    process.exitCode = 2;
    return;
  }
  printResult(result, options.json);
  process.exitCode = options.command === 'status' && result.status !== 'RISK_ACKNOWLEDGED' ? 1 : 0;
}

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(currentFile)) {
  await main();
}
