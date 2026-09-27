import type { Claim, Evidence, Workspace } from '../../lib/contracts/workflow';

type Conclusion = Claim['conclusions'][number];

const DOCUMENT_LABELS: [RegExp, string][] = [
  [/location[\s_-]*confirmation|encounter/, 'Encounter record'],
  [/provider[\s_-]*bill|statement/, 'Provider bill'],
  [/authorization/, 'Authorization'],
  [/denial/, 'Denial notice'],
  [/\beob\b/, 'EOB'],
  [/plan|spd/, 'Health plan'],
];

const QUESTION_LABELS: Record<string, string> = {
  'Q-location': 'Your reported service location',
  'Q-payment': 'Your reported payment update',
  'Q-receipt': 'Your reported receipt date',
};

export function selectDisputedRecord(claim: Claim) {
  const disputedId = claim.denial.claim_id?.value;
  const eob =
    claim.eobs.find((item) => item.claim_id.value === disputedId) ??
    claim.eobs[0];
  const service =
    claim.services.find((item) => item.id === eob?.service_id) ??
    claim.services[0];
  return { eob, service };
}

export function selectPrimaryConclusion(claim: Claim): Conclusion | undefined {
  return (
    claim.conclusions.find((item) =>
      ['network-location', 'authorization', 'scope'].includes(item.id),
    ) ??
    claim.conclusions.find((item) => item.classification !== 'fact') ??
    claim.conclusions[0]
  );
}

export function outcomePresentation(outcome?: string) {
  if (outcome === 'possible_processing_error') {
    return {
      headline: 'Possible claim-processing mismatch',
      label: 'Review warranted',
      tone: 'review',
    };
  }
  if (outcome === 'likely_correct') {
    return {
      headline: 'The decision may match the current records',
      label: 'Check other exceptions',
      tone: 'neutral',
    };
  }
  if (outcome === 'possible_coverage_dispute') {
    return {
      headline: 'A coverage dispute needs review',
      label: 'Review the decision',
      tone: 'review',
    };
  }
  return {
    headline: 'More information is needed',
    label: 'Evidence incomplete',
    tone: 'incomplete',
  };
}

export function settingLabel(value: unknown, submitted = false) {
  const normalized = String(value ?? '').toLowerCase();
  const setting =
    {
      '11': 'Office',
      '19': 'Off-campus hospital outpatient department',
      '22': 'Hospital outpatient department',
      '24': 'Ambulatory surgical center',
      asc: 'Ambulatory surgical center',
      hospital: 'Hospital',
      office: 'Office',
    }[normalized] ?? (value == null ? 'Unknown' : String(value));
  return submitted && value != null
    ? `${setting} (submitted POS ${value})`
    : setting;
}

function documentName(filename: string) {
  const normalized = filename
    .replace(/\.[^.]+$/, '')
    .replace(/^\d+[\s_-]*/, '')
    .toLowerCase();
  return (
    DOCUMENT_LABELS.find(([pattern]) => pattern.test(normalized))?.[1] ??
    filename.replace(/\.[^.]+$/, '')
  );
}

function authorityLabel(sourceUrl: string | null) {
  if (!sourceUrl) return 'External guidance';
  try {
    const host = new URL(sourceUrl).hostname.replace(/^www\./, '');
    if (host.includes('cms.gov')) return 'CMS guidance';
    if (host.includes('dol.gov')) return 'U.S. Labor guidance';
    if (host.includes('ecfr.gov')) return 'Federal regulations';
    return `${host} guidance`;
  } catch {
    return 'External guidance';
  }
}

export function evidenceLabel(evidence: Evidence, workspace: Workspace) {
  if (evidence.domain === 'user_answer') {
    return QUESTION_LABELS[evidence.location.section] ?? 'Your answer';
  }
  if (evidence.source_url || evidence.domain === 'external') {
    return authorityLabel(evidence.source_url);
  }
  const document = workspace.documents.find(
    (item) => item.document.id === evidence.document_id,
  );
  const label = document
    ? documentName(document.document.filename)
    : 'Source document';
  return evidence.location.page == null
    ? label
    : `${label} · p. ${evidence.location.page}`;
}
