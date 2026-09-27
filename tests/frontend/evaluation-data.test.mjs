import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluationRuns,
  evaluationSummary,
  workflowRuns,
} from '../../apps/web/src/features/evaluation/data.ts';

test('evaluation summary matches the retained live report', () => {
  const summary = evaluationSummary(evaluationRuns);
  assert.deepEqual(summary, {
    passed: 12,
    firstPass: 11,
    repaired: 1,
    medianSeconds: 38.72,
  });
  assert.equal(
    evaluationRuns.find((run) => run.repaired)?.name,
    'authorization-3-3',
  );
});

test('deterministic workflow measurements retain zero provider calls', () => {
  assert.deepEqual(
    workflowRuns.map((run) => run.milliseconds),
    [14, 13, 13],
  );
  assert.ok(workflowRuns.every((run) => run.providerCalls === 0));
});

test('empty evaluation data has an explicit unavailable state', () => {
  assert.equal(evaluationSummary([]), null);
});
