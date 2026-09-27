import type { Claim, Evidence, Workspace } from '../../lib/contracts/workflow';

type Conclusion = Claim['conclusions'][number];
type StoryStep = {
  title: string;
  detail: string;
  evidenceIds: string[];
  kind: 'fact' | 'finding';
  status: 'document' | 'user' | 'conflict' | 'unresolved' | 'derived';
  statusLabel: string;
};

export const evidenceStatusMarker = (status: StoryStep['status']) =>
  ({
    document: '✓',
    user: '•',
    conflict: '!',
    unresolved: '?',
    derived: '→',
  })[status];

export function orderClarifications(questions: Claim['questions']) {
  return [...questions].sort((left, right) => {
    if (left.id === 'Q-location') return -1;
    if (right.id === 'Q-location') return 1;
    return 0;
  });
}

function factAuthority(status?: string) {
  if (status === 'user_reported') {
    return { status: 'user' as const, statusLabel: 'User reported' };
  }
  if (status === 'conflicted') {
    return { status: 'conflict' as const, statusLabel: 'Conflict detected' };
  }
  if (status === 'unknown') {
    return { status: 'unresolved' as const, statusLabel: 'Still unresolved' };
  }
  return { status: 'document' as const, statusLabel: 'Supported by document' };
}

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

export function documentTypeLabel(filename: string) {
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
    ? documentTypeLabel(document.document.filename)
    : 'Source document';
  return evidence.location.page == null
    ? label
    : `${label} · p. ${evidence.location.page}`;
}

export function analysisProgress(stage?: string) {
  const stages = [
    {
      id: 'extracting',
      label: 'Reading insurance documents',
      detail: 'Extracting claim details and preserving page references.',
    },
    {
      id: 'retrieving',
      label: 'Identifying the denied claim',
      detail: 'Separating the disputed claim from related bills and EOBs.',
    },
    {
      id: 'analyzing',
      label: 'Comparing the denial with plan coverage',
      detail: 'Checking submitted facts against the relevant plan provisions.',
    },
    {
      id: 'validating',
      label: 'Checking supporting records',
      detail: 'Confirming that each finding points back to available evidence.',
    },
    {
      id: 'complete',
      label: 'Building evidence-backed findings',
      detail: 'Organizing the finding, unknowns, and next actions.',
    },
  ];
  const active = Math.max(
    0,
    stages.findIndex((item) => item.id === stage),
  );
  return stages.map((item, index) => ({
    ...item,
    state:
      stage === 'complete' || index < active
        ? ('complete' as const)
        : index === active
          ? ('active' as const)
          : ('pending' as const),
  }));
}

export function evidenceStory(claim: Claim): StoryStep[] {
  const selected = selectDisputedRecord(claim);
  const primary = selectPrimaryConclusion(claim);
  const steps: StoryStep[] = [];
  if (claim.denial.reason?.value != null) {
    steps.push({
      title: `The claim was denied for ${String(claim.denial.reason.value)}`,
      detail: 'This is the reason stated in the denial record.',
      evidenceIds: claim.denial.reason.evidence_ids,
      kind: 'fact',
      ...factAuthority(claim.denial.reason.status),
    });
  }
  if (selected.service?.submitted_pos.value != null) {
    steps.push({
      title: `The claim was submitted as ${settingLabel(
        selected.service.submitted_pos.value,
      ).toLowerCase()}`,
      detail: 'This is the service setting used to process the claim.',
      evidenceIds: selected.service.submitted_pos.evidence_ids,
      kind: 'fact',
      ...factAuthority(selected.service.submitted_pos.status),
    });
  }
  if (selected.service?.actual_setting.value != null) {
    steps.push({
      title: `The records document ${settingLabel(
        selected.service.actual_setting.value,
      ).toLowerCase()}`,
      detail: 'This setting comes from the available encounter evidence.',
      evidenceIds: selected.service.actual_setting.evidence_ids,
      kind: 'fact',
      ...factAuthority(selected.service.actual_setting.status),
    });
  }
  if (primary) {
    steps.push({
      title: outcomePresentation(primary.outcome).headline,
      detail: primary.text,
      evidenceIds: primary.evidence_ids,
      kind: 'finding',
      status: 'derived',
      statusLabel: 'Derived finding',
    });
  }
  return steps;
}

export function unresolvedItems(claim: Claim) {
  const primary = selectPrimaryConclusion(claim);
  const items: { title: string; why: string }[] = [];
  if (claim.corrected_liability_cents.value == null) {
    items.push({
      title: 'Final corrected amount owed',
      why:
        claim.corrected_liability_cents.reason ??
        'The available records do not establish final liability.',
    });
  }
  for (const unresolved of primary?.unresolved ?? []) {
    if (!items.some((item) => item.title === unresolved)) {
      items.push({
        title: unresolved,
        why: 'This fact is still needed to strengthen or narrow the finding.',
      });
    }
  }
  for (const question of claim.questions.filter(
    (item) => item.status === 'open' && !item.answer,
  )) {
    const targetLabel = question.target_fact_path
      ?.split('.')
      .at(-1)
      ?.replaceAll('_', ' ');
    const representedByConclusion =
      (targetLabel &&
        (primary?.unresolved ?? []).some((item) =>
          item.toLowerCase().includes(targetLabel.toLowerCase()),
        )) ||
      (question.id === 'Q-location' &&
        (primary?.unresolved ?? []).some((item) =>
          item.toLowerCase().includes('actual service setting'),
        ));
    if (representedByConclusion) continue;
    if (!items.some((item) => item.title === question.prompt)) {
      items.push({ title: question.prompt, why: question.why });
    }
  }
  return items;
}

export function prioritizedUnresolvedItems(claim: Claim) {
  const items = unresolvedItems(claim);
  const primary = selectPrimaryConclusion(claim);
  const conclusionItems = (primary?.unresolved ?? [])
    .map((title) => items.find((item) => item.title === title))
    .filter((item): item is (typeof items)[number] => Boolean(item));
  const candidates = conclusionItems.length ? conclusionItems : items;
  const highImpact = candidates.slice(0, 2);
  const highImpactTitles = new Set(highImpact.map((item) => item.title));
  return {
    highImpact,
    secondary: items.filter((item) => !highImpactTitles.has(item.title)),
  };
}

function factValues(claim: Claim) {
  return [
    ...Object.values(claim.patient),
    ...Object.values(claim.plan),
    ...Object.values(claim.denial),
    claim.corrected_liability_cents,
    ...claim.services.flatMap((service) => [
      service.description,
      service.submitted_pos,
      service.actual_setting,
    ]),
    ...claim.eobs.flatMap((eob) => [
      eob.claim_id,
      ...Object.values(eob.financial),
    ]),
    ...claim.bills.flatMap((bill) => [
      bill.claim_id,
      bill.balance_cents,
      bill.statement_date,
    ]),
  ];
}

export function trustSummary(claim: Claim) {
  const primary = selectPrimaryConclusion(claim);
  return {
    supportedFacts: factValues(claim).filter(
      (fact) => fact.value != null && fact.evidence_ids.length > 0,
    ).length,
    unresolvedItems: unresolvedItems(claim).length,
    primarySourceCount: new Set(primary?.evidence_ids ?? []).size,
  };
}

export function technicalTrace(claim: Claim) {
  const facts = factValues(claim);
  const documentEvidence = claim.evidence.filter(
    (item) => item.document_id != null,
  );
  return {
    selectedEvidence: claim.evidence.length,
    documentEvidence: documentEvidence.length,
    exactRestorations: documentEvidence.filter(
      (item) => item.verification === 'exact_match',
    ).length,
    userReported: claim.evidence.filter((item) => item.domain === 'user_answer')
      .length,
    conflicts: facts.filter((item) => item.status === 'conflicted').length,
    unresolved: unresolvedItems(claim).length,
    derivedFindings: claim.conclusions.filter(
      (item) => item.classification !== 'fact',
    ).length,
  };
}
