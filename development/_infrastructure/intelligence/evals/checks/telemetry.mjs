// _infrastructure/intelligence/evals/checks/telemetry.mjs
import { createHash } from 'node:crypto';

/**
 * Tier 0: Telemetry collection.
 * Runs on 100% of executions, $0 cost, <1ms.
 *
 * @param {object} params
 * @param {string} params.namespace - Command namespace (e.g., "inbox")
 * @param {string} params.command - Command name (e.g., "triage")
 * @param {string} [params.input] - Raw input text (for hashing)
 * @param {string} params.output - Raw output text
 * @param {number} [params.tokensIn] - Input token count
 * @param {number} [params.tokensOut] - Output token count
 * @param {number} [params.durationMs] - Execution duration in ms
 * @returns {object} Telemetry data ready for exec_log insertion
 */
export function collectTelemetry({ namespace, command, input, output, tokensIn, tokensOut, durationMs }) {
  return {
    namespace,
    command,
    inputHash: input ? sha256(input) : null,
    outputHash: output ? sha256(output) : null,
    outputPreview: output ? output.slice(0, 500) : null,
    tokenInput: tokensIn ?? null,
    tokenOutput: tokensOut ?? null,
    durationMs: durationMs ?? null
  };
}

function sha256(text) {
  return createHash('sha256').update(text).digest('hex');
}
