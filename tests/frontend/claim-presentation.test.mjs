import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  analysisProgress,
  documentTypeLabel,
  evidenceLabel,
  evidenceStatusMarker,
  evidenceStory,
  orderClarifications,
  outcomePresentation,
  prioritizedUnresolvedItems,
  selectDisputedRecord,
  selectPrimaryConclusion,
  settingLabel,
  technicalTrace,
  trustSummary,
  unresolvedItems,
} from '../../apps/web/src/features/analysis/presentation.ts';

const fact = (value, evidence_ids = []) => ({ value, evidence_ids });
const claim = {
  denial: { claim_id: fact('disputed') },
  eobs: [
    { id: 'paid', claim_id: fact('related'), service_id: 'service-2' },
    { id: 'denied', claim_id: fact('disputed'), service_id: 'service-1' },
  ],
  services: [
    { id: 'service-1', submitted_pos: fact('11'), actual_setting: fact('asc') },
    { id: 'service-2', submitted_pos: fact('24'), actual_setting: fact('asc') },
  ],
  conclusions: [
    {
      id: 'denial',
      classification: 'fact',
      outcome: 'possible_coverage_dispute',
    },
    {
      id: 'network-location',
      classification: 'interpretation',
      outcome: 'possible_processing_error',
    },
  ],
};

const workspace = {
  documents: [
    { document: { id: 'plan', filename: '01-plan.pdf' } },
    { document: { id: 'eob', filename: '02-eob.pdf' } },
    { document: { id: 'encounter', filename: '06-location-confirmation.pdf' } },
  ],
};

test('selects the disputed claim, its service, and the actionable conclusion', () => {
  const selected = selectDisputedRecord(claim);
  assert.equal(selected.eob.id, 'denied');
  assert.equal(selected.service.id, 'service-1');
  assert.equal(selectPrimaryConclusion(claim).id, 'network-location');
});

test('presents bounded outcomes and service settings in plain language', () => {
  assert.equal(
    outcomePresentation('possible_processing_error').headline,
    'Possible claim-processing mismatch',
  );
  assert.equal(outcomePresentation('likely_correct').tone, 'neutral');
  assert.equal(outcomePresentation('missing_information').tone, 'incomplete');
  assert.equal(settingLabel('11', true), 'Office (submitted POS 11)');
  assert.equal(settingLabel('asc'), 'Ambulatory surgical center');
  assert.equal(settingLabel(null), 'Unknown');
});

test('labels document, user, external, and unmatched evidence readably', () => {
  const location = (page, section = '') => ({ page, section });
  assert.equal(
    evidenceLabel(
      {
        domain: 'claim',
        document_id: 'eob',
        source_url: null,
        location: location(1),
      },
      workspace,
    ),
    'EOB · p. 1',
  );
  assert.equal(
    evidenceLabel(
      {
        domain: 'claim',
        document_id: 'encounter',
        source_url: null,
        location: location(2),
      },
      workspace,
    ),
    'Encounter record · p. 2',
  );
  assert.equal(
    evidenceLabel(
      {
        domain: 'user_answer',
        document_id: null,
        source_url: null,
        location: location(null, 'Q-receipt'),
      },
      workspace,
    ),
    'Your reported receipt date',
  );
  assert.equal(
    evidenceLabel(
      {
        domain: 'external',
        document_id: null,
        source_url: 'https://www.cms.gov/example',
        location: location(null),
      },
      workspace,
    ),
    'CMS guidance',
  );
  assert.equal(
    evidenceLabel(
      {
        domain: 'external',
        document_id: null,
        source_url: 'https://www.ecfr.gov/current/title-45',
        location: location(null),
      },
      workspace,
    ),
    'Federal regulations',
  );
  assert.equal(
    evidenceLabel(
      {
        domain: 'claim',
        document_id: 'missing',
        source_url: null,
        location: location(3),
      },
      workspace,
    ),
    'Source document · p. 3',
  );
});

test('maps real backend stages to an honest staged loading experience', () => {
  const extracting = analysisProgress('extracting');
  assert.equal(extracting[0].state, 'active');
  assert.equal(extracting[1].state, 'pending');
  const validating = analysisProgress('validating');
  assert.equal(validating[0].state, 'complete');
  assert.equal(validating[3].state, 'active');
  assert.equal(validating[4].state, 'pending');
  assert.ok(
    analysisProgress('complete').every((item) => item.state === 'complete'),
  );
});

test('creates a traceable evidence story and honest trust summary', () => {
  const richClaim = {
    ...claim,
    patient: { member: fact('Avery', ['member-source']) },
    plan: { type: fact('self-funded', ['plan-source']) },
    denial: {
      claim_id: fact('disputed', ['denial-source']),
      reason: fact('out-of-network office service', ['denial-source']),
    },
    corrected_liability_cents: {
      ...fact(null),
      reason: 'Final adjudication remains unresolved',
    },
    services: [
      {
        id: 'service-1',
        description: fact('Anesthesia', ['service-source']),
        submitted_pos: fact('11', ['eob-source']),
        actual_setting: fact('asc', ['encounter-source']),
      },
    ],
    eobs: [
      {
        id: 'denied',
        claim_id: fact('disputed', ['eob-source']),
        service_id: 'service-1',
        financial: {
          billed_cents: fact(420000, ['eob-source']),
          paid_cents: fact(0, ['eob-source']),
        },
      },
    ],
    bills: [],
    conclusions: [
      {
        id: 'network-location',
        classification: 'interpretation',
        outcome: 'possible_processing_error',
        text: 'The submitted and documented settings disagree.',
        evidence_ids: ['eob-source', 'encounter-source', 'plan-source'],
        unresolved: ['Recognized amount'],
      },
    ],
    questions: [
      {
        id: 'Q-receipt',
        prompt: 'When did you receive the denial?',
        why: 'Needed to calculate the appeal date.',
        status: 'open',
        answer: null,
        evidence_ids: [],
      },
    ],
  };
  const story = evidenceStory(richClaim);
  assert.equal(story.length, 4);
  assert.match(story[1].title, /submitted as office/i);
  assert.match(story[2].title, /ambulatory surgical center/i);
  assert.equal(story.at(-1).kind, 'finding');
  assert.equal(story.at(-1).statusLabel, 'Derived finding');
  const unknowns = unresolvedItems(richClaim);
  assert.equal(unknowns[0].title, 'Final corrected amount owed');
  assert.ok(unknowns.some((item) => item.title === 'Recognized amount'));
  assert.ok(unknowns.some((item) => item.title === 'When did you receive the denial?'));
  assert.ok(
    !unresolvedItems({
      ...richClaim,
      questions: [
        {
          ...richClaim.questions[0],
          status: 'resolved_by_document',
        },
      ],
    }).some((item) => item.title === 'When did you receive the denial?'),
  );
  const trust = trustSummary(richClaim);
  assert.ok(trust.supportedFacts >= 6);
  assert.equal(trust.primarySourceCount, 3);
  assert.ok(trust.unresolvedItems >= 2);

  const prioritized = prioritizedUnresolvedItems(richClaim);
  assert.deepEqual(
    prioritized.highImpact.map((item) => item.title),
    ['Recognized amount'],
  );
  assert.ok(
    prioritized.secondary.some(
      (item) => item.title === 'Final corrected amount owed',
    ),
  );
  assert.ok(
    prioritized.secondary.some(
      (item) => item.title === 'When did you receive the denial?',
    ),
  );
});

test('keeps every evidence status explicit and puts location first', () => {
  assert.deepEqual(
    ['document', 'user', 'conflict', 'unresolved', 'derived'].map(
      evidenceStatusMarker,
    ),
    ['✓', '•', '!', '?', '→'],
  );
  const questions = [
    { id: 'Q-receipt' },
    { id: 'Q-payment' },
    { id: 'Q-location' },
  ];
  assert.deepEqual(
    orderClarifications(questions).map((item) => item.id),
    ['Q-location', 'Q-receipt', 'Q-payment'],
  );
  assert.deepEqual(
    questions.map((item) => item.id),
    ['Q-receipt', 'Q-payment', 'Q-location'],
  );
});

test('surfaces two conclusion-critical unknowns and keeps the rest available', () => {
  const claimWithUnknowns = {
    corrected_liability_cents: {
      ...fact(null),
      reason: 'Final adjudication remains unresolved',
    },
    conclusions: [
      {
        id: 'network-location',
        classification: 'interpretation',
        outcome: 'possible_processing_error',
        text: 'The submitted setting needs review.',
        evidence_ids: [],
        unresolved: [
          'Actual service setting',
          'Service-date facility participation',
          'Applicable plan scope',
        ],
      },
    ],
    questions: [
      {
        id: 'Q-location',
        prompt: 'Where did the disputed service occur?',
        why: 'Needed to confirm the service setting.',
        status: 'open',
        answer: null,
        evidence_ids: [],
        target_fact_path: 'services.actual_setting',
      },
      {
        id: 'Q-receipt',
        prompt: 'When did you receive the denial?',
        why: 'Needed to calculate the appeal date.',
        status: 'open',
        answer: null,
        evidence_ids: [],
      },
    ],
  };
  const prioritized = prioritizedUnresolvedItems(claimWithUnknowns);
  assert.deepEqual(
    prioritized.highImpact.map((item) => item.title),
    ['Actual service setting', 'Service-date facility participation'],
  );
  assert.ok(
    prioritized.secondary.some(
      (item) => item.title === 'Applicable plan scope',
    ),
  );
  assert.ok(
    ![...prioritized.highImpact, ...prioritized.secondary].some(
      (item) => item.title === 'Where did the disputed service occur?',
    ),
  );
});

test('recognizes document types without exposing raw filenames as the label', () => {
  assert.equal(documentTypeLabel('03-denial.pdf'), 'Denial notice');
  assert.equal(documentTypeLabel('02-eob.pdf'), 'EOB');
  assert.equal(
    documentTypeLabel('06-location-confirmation.pdf'),
    'Encounter record',
  );
  assert.equal(
    documentTypeLabel('long-custom-record.pdf'),
    'long-custom-record',
  );
});

test('summarizes a technical trace without inventing confidence', () => {
  const traced = {
    ...claim,
    patient: {
      member: { ...fact('Avery', ['doc-1']), status: 'explicit' },
    },
    plan: {},
    denial: {
      claim_id: { ...fact('disputed', ['doc-1']), status: 'explicit' },
    },
    corrected_liability_cents: {
      ...fact(null),
      status: 'unknown',
      reason: 'Final amount not established',
    },
    services: [
      {
        id: 'service-1',
        description: { ...fact('Anesthesia', ['doc-1']), status: 'explicit' },
        submitted_pos: { ...fact('11', ['doc-1']), status: 'explicit' },
        actual_setting: { ...fact(null), status: 'conflicted' },
      },
    ],
    eobs: [],
    bills: [],
    questions: [],
    conclusions: [
      {
        id: 'network-location',
        classification: 'conditional',
        outcome: 'missing_information',
        text: 'More evidence is needed.',
        evidence_ids: ['doc-1', 'user-1'],
        unresolved: ['Actual setting'],
      },
    ],
    evidence: [
      {
        id: 'doc-1',
        document_id: 'eob',
        domain: 'user',
        verification: 'exact_match',
      },
      {
        id: 'user-1',
        document_id: null,
        domain: 'user_answer',
        verification: 'unverified',
      },
    ],
  };
  const trace = technicalTrace(traced);
  assert.equal(trace.documentEvidence, 1);
  assert.equal(trace.exactRestorations, 1);
  assert.equal(trace.userReported, 1);
  assert.equal(trace.conflicts, 1);
  assert.equal(trace.derivedFindings, 1);
  assert.ok(!('confidence' in trace));
});
