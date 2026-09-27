export type EvaluationRun = {
  name: string;
  scenario: string;
  seconds: number;
  repaired: boolean;
};

// Recorded September 26, 2026 in
// var/evaluations/02b1d7a12604432fba879a580395466c/summary.json.
// The local artifact is intentionally ignored by git; docs/live-validation.md
// contains the checked-in report for this snapshot.
export const evaluationRuns: EvaluationRun[] = [
  {
    name: 'original-1-5',
    scenario: 'Network · initial',
    seconds: 42.32,
    repaired: false,
  },
  {
    name: 'original-1-6',
    scenario: 'Network · clarified',
    seconds: 44.05,
    repaired: false,
  },
  {
    name: 'original-2-5',
    scenario: 'Network · initial',
    seconds: 43.59,
    repaired: false,
  },
  {
    name: 'original-2-6',
    scenario: 'Network · clarified',
    seconds: 35.75,
    repaired: false,
  },
  {
    name: 'original-3-5',
    scenario: 'Network · initial',
    seconds: 44.16,
    repaired: false,
  },
  {
    name: 'original-3-6',
    scenario: 'Network · clarified',
    seconds: 38.34,
    repaired: false,
  },
  { name: 'office-1-3', scenario: 'Office', seconds: 25.98, repaired: false },
  { name: 'office-2-3', scenario: 'Office', seconds: 39.1, repaired: false },
  { name: 'office-3-3', scenario: 'Office', seconds: 36.24, repaired: false },
  {
    name: 'authorization-1-3',
    scenario: 'Authorization',
    seconds: 29.78,
    repaired: false,
  },
  {
    name: 'authorization-2-3',
    scenario: 'Authorization',
    seconds: 38.09,
    repaired: false,
  },
  {
    name: 'authorization-3-3',
    scenario: 'Authorization',
    seconds: 66.82,
    repaired: true,
  },
];

export const workflowRuns = [
  { name: 'Clarification run 1', milliseconds: 14, providerCalls: 0 },
  { name: 'Clarification run 2', milliseconds: 13, providerCalls: 0 },
  { name: 'Clarification run 3', milliseconds: 13, providerCalls: 0 },
];

export function evaluationSummary(runs: EvaluationRun[]) {
  if (!runs.length) return null;
  const ordered = runs.map((run) => run.seconds).sort((a, b) => a - b);
  const lower = ordered[Math.floor((ordered.length - 1) / 2)] ?? 0;
  const upper = ordered[Math.floor(ordered.length / 2)] ?? lower;
  const median = (lower + upper) / 2;
  return {
    passed: runs.length,
    firstPass: runs.filter((run) => !run.repaired).length,
    repaired: runs.filter((run) => run.repaired).length,
    medianSeconds: Number(median.toFixed(2)),
  };
}
