import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  evidenceLabel,
  outcomePresentation,
  selectDisputedRecord,
  selectPrimaryConclusion,
  settingLabel,
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
