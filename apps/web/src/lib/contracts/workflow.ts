import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import claimSchema from '../../../../../claimbridge-prep/schemas/claim.schema.json';
import evidenceSchema from '../../../../../claimbridge-prep/schemas/evidence.schema.json';
import actionsSchema from '../../../../../claimbridge-prep/schemas/action-plan.schema.json';
import documentSchema from '../../../../../claimbridge-prep/schemas/document.schema.json';

export type Fact = {
  value: string | number | boolean | null;
  status: string;
  evidence_ids: string[];
  reason: string | null;
  derivation: { method: string; input_fact_paths: string[] } | null;
};
export type Evidence = {
  id: string;
  domain: string;
  kind: string;
  document_id: string | null;
  source_url: string | null;
  text: string;
  text_kind: string;
  accessed_at: string | null;
  location: { page: number | null; section: string };
};
export type Claim = {
  id: string;
  revision: number;
  patient: Record<string, Fact>;
  plan: Record<string, Fact>;
  denial: Record<string, Fact>;
  corrected_liability_cents: Fact;
  evidence: Evidence[];
  services: {
    id: string;
    description: Fact;
    submitted_pos: Fact;
    actual_setting: Fact;
  }[];
  eobs: {
    id: string;
    claim_id: Fact;
    service_id: string;
    financial: Record<string, Fact>;
  }[];
  bills: {
    id: string;
    claim_id: Fact;
    balance_cents: Fact;
    statement_date: Fact;
  }[];
  conclusions: {
    id: string;
    text: string;
    classification: string;
    outcome: string;
    evidence_ids: string[];
    unresolved: string[];
  }[];
  questions: {
    id: string;
    prompt: string;
    why: string;
    status: string;
    answer: string | null;
    evidence_ids: string[];
  }[];
};
export type Workspace = {
  id: string;
  revision: number;
  status: string;
  documents: {
    document: {
      id: string;
      filename: string;
      status: string;
      pages: number | null;
    };
    pages: { id: string; page: number; text: string }[];
  }[];
};
export type Job = {
  job_id: string;
  workspace_id: string;
  revision: number;
  status: string;
  stage: string;
  error: string | null;
  retryable: boolean;
};
export type ClaimResponse = {
  claim: Claim | null;
  revision: number;
  analysis_status: string;
  job: Job | null;
  revisions: number[];
  draft_ids: string[];
  metadata: { mode?: string; elapsed_ms?: number };
};
export type Actions = {
  claim_id: string;
  claim_revision: number;
  status: string;
  submitted: false;
  actions: {
    id: string;
    title: string;
    instructions: string;
    due: Fact;
    evidence_ids: string[];
  }[];
  arguments: {
    id: string;
    statement: string;
    evidence_ids: string[];
    limitations: string[];
    requested_remedy: string;
  }[];
};
export type Draft = {
  draft_id: string;
  revision: number;
  version: number;
  submitted: false;
  text: string;
  attachments: string[];
  unresolved_fields: string[];
  evidence_ids: string[];
  stale?: boolean;
  user_edited: boolean;
};
const ajv = new Ajv2020({ strict: false });
addFormats(ajv);
ajv.addSchema(evidenceSchema);
const claim = ajv.compile<Claim>(claimSchema);
const actions = ajv.compile<Actions>(actionsSchema);
const document = ajv.compile(documentSchema);
const object = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);
const strings = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');
export function isWorkspace(value: unknown): value is Workspace {
  return (
    object(value) &&
    typeof value.id === 'string' &&
    Number.isInteger(value.revision) &&
    typeof value.status === 'string' &&
    Array.isArray(value.documents) &&
    value.documents.every(
      (entry: unknown) =>
        object(entry) &&
        document(entry.document) &&
        Array.isArray(entry.pages) &&
        entry.pages.every(
          (page: unknown) =>
            object(page) &&
            typeof page.id === 'string' &&
            Number.isInteger(page.page) &&
            typeof page.text === 'string',
        ),
    )
  );
}
export function isJob(value: unknown): value is Job {
  return (
    object(value) &&
    typeof value.job_id === 'string' &&
    typeof value.workspace_id === 'string' &&
    Number.isInteger(value.revision) &&
    ['queued', 'running', 'succeeded', 'failed', 'obsolete'].includes(
      String(value.status),
    ) &&
    typeof value.stage === 'string' &&
    (value.error === null || typeof value.error === 'string') &&
    typeof value.retryable === 'boolean'
  );
}
export function isClaimResponse(value: unknown): value is ClaimResponse {
  return (
    object(value) &&
    (value.claim === null || claim(value.claim)) &&
    Number.isInteger(value.revision) &&
    typeof value.analysis_status === 'string' &&
    (value.job === null || isJob(value.job)) &&
    Array.isArray(value.revisions) &&
    value.revisions.every(Number.isInteger) &&
    strings(value.draft_ids) &&
    object(value.metadata)
  );
}
export const isActions = (value: unknown): value is Actions => actions(value);
export function isDraft(value: unknown): value is Draft {
  return (
    object(value) &&
    typeof value.draft_id === 'string' &&
    Number.isInteger(value.revision) &&
    Number.isInteger(value.version) &&
    value.submitted === false &&
    typeof value.text === 'string' &&
    strings(value.attachments) &&
    strings(value.evidence_ids) &&
    strings(value.unresolved_fields) &&
    typeof value.user_edited === 'boolean' &&
    (value.stale === undefined || typeof value.stale === 'boolean')
  );
}
export function isProvider(
  value: unknown,
): value is { configured: boolean; model: string; live_validation: string } {
  return (
    object(value) &&
    typeof value.configured === 'boolean' &&
    typeof value.model === 'string' &&
    typeof value.live_validation === 'string'
  );
}
