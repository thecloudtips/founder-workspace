// _infrastructure/intelligence/evals/checks/format.mjs

/**
 * Tier 1: Format checks (deterministic).
 * Runs on 100% of executions, $0 cost, <5ms.
 *
 * @param {string} output - Command output text
 * @param {object} rubric - Tier 1 rubric config from rubric JSON
 * @returns {{ pass: boolean, details: object }}
 */
export function checkFormat(output, rubric) {
  const tier1 = rubric?.tier1 ?? {};
  const results = {};
  let allPass = true;

  // Check: non-empty output
  if (!output || output.trim().length === 0) {
    results.non_empty = { pass: false, reason: 'Output is empty' };
    return { pass: false, details: results };
  }
  results.non_empty = { pass: true };

  // Check: required sections
  if (tier1.required_sections?.length > 0) {
    const missing = tier1.required_sections.filter(s => !output.includes(s));
    const pass = missing.length === 0;
    results.required_sections = { pass, missing: missing.length > 0 ? missing : undefined };
    if (!pass) allPass = false;
  }

  // Check: word count bounds
  const wordCount = output.split(/\s+/).filter(w => w.length > 0).length;
  const minWords = tier1.min_words ?? 10;
  const maxWords = tier1.max_words ?? 5000;

  if (wordCount < minWords) {
    results.min_words = { pass: false, actual: wordCount, min: minWords };
    allPass = false;
  } else {
    results.min_words = { pass: true, actual: wordCount };
  }

  if (wordCount > maxWords) {
    results.max_words = { pass: false, actual: wordCount, max: maxWords };
    allPass = false;
  } else {
    results.max_words = { pass: true, actual: wordCount };
  }

  // Check: forbidden patterns
  if (tier1.forbidden_patterns?.length > 0) {
    const found = tier1.forbidden_patterns.filter(p => output.includes(p));
    const pass = found.length === 0;
    results.forbidden_patterns = { pass, found: found.length > 0 ? found : undefined };
    if (!pass) allPass = false;
  }

  return { pass: allPass, details: results };
}
