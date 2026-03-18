// _infrastructure/intelligence/evals/checks/schema.mjs

/**
 * Tier 1: Schema/structure validation (deterministic).
 * Validates JSON output structure when rubric specifies required fields.
 *
 * @param {string} output - Command output text
 * @param {object} rubric - Tier 1 rubric config
 * @returns {{ pass: boolean, details: object }}
 */
export function checkSchema(output, rubric) {
  const tier1 = rubric?.tier1 ?? {};
  const requiredFields = tier1.required_json_fields;

  // Skip if no JSON fields required
  if (!requiredFields || requiredFields.length === 0) {
    return { pass: true, details: { skipped: true, reason: 'No JSON fields required' } };
  }

  // Try to extract JSON from the output
  const jsonBlock = extractJson(output);
  if (!jsonBlock) {
    return {
      pass: false,
      details: { json_parse: { pass: false, reason: 'No valid JSON found in output' } }
    };
  }

  // Check required fields
  const missing = requiredFields.filter(field => !(field in jsonBlock));
  const pass = missing.length === 0;

  return {
    pass,
    details: {
      json_parse: { pass: true },
      required_fields: { pass, missing: missing.length > 0 ? missing : undefined }
    }
  };
}

/**
 * Extract first JSON object or array from text.
 * Handles JSON embedded in markdown code blocks.
 */
function extractJson(text) {
  // Try markdown code block first
  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (codeBlockMatch) {
    try { return JSON.parse(codeBlockMatch[1].trim()); } catch {}
  }

  // Try raw JSON (first { or [)
  const start = text.search(/[{[]/);
  if (start === -1) return null;

  // Find the matching close bracket
  const openChar = text[start];
  const closeChar = openChar === '{' ? '}' : ']';
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === openChar) depth++;
    if (text[i] === closeChar) depth--;
    if (depth === 0) {
      try { return JSON.parse(text.slice(start, i + 1)); } catch { return null; }
    }
  }
  return null;
}
