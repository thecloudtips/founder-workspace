// _infrastructure/intelligence/evals/sampler.mjs

/**
 * Decides whether this execution should be sampled for Tier 2 eval.
 *
 * Rules:
 * - T1 failure → always sample (100%)
 * - Otherwise → random at rubric sample_rate (default 20%)
 *
 * @param {boolean} t1Pass - Whether Tier 1 checks passed
 * @param {object} rubric - Rubric config (may contain tier2.sample_rate)
 * @returns {boolean} true if this execution should be sent to Tier 2
 */
export function shouldSample(t1Pass, rubric) {
  const sampleRate = rubric?.tier2?.sample_rate ?? 0.20;

  // If sample_rate is 0, never sample (e.g., invoice = deterministic-only)
  if (sampleRate === 0) return false;

  // T1 failures always get Tier 2 evaluation
  if (!t1Pass) return true;

  return Math.random() < sampleRate;
}
