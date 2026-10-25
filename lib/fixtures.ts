/**
 * Synthetic demonstration fixtures for the Company Operations Hub design.
 * All names, figures and records are invented. Emergent: replace with
 * company-scoped, permission-filtered API responses (see docs/DESIGN_HANDOFF.md).
 */

export type DeptId = 'dev' | 'mkt' | 'sup' | 'hr' | 'fin' | 'exec'

export const CENTRAL_IDS = {
  platform_product_id: 'pp_operations_hub',
  product_account_id: 'pa_7F3K_COMETWORKS',
}

export const companies = [
  { id: 'co_comet_works', name: 'Comet Works', product_account_id: 'pa_7F3K_COMETWORKS', plan: 'Operations Growth' },
  { id: 'co_comet_labs', name: 'Comet Labs', product_account_id: 'pa_2Q9M_COMETLABS', plan: 'Operations Starter' },
] as const

export type Department = {
  id: DeptId
  name: string
  leadId: string
  colorClass: string
  bgClass: string
  borderClass: string
  isDepartment: boolean
}

export const departments: Department[] = [
  { id: 'exec', name: 'Leadership', leadId: 'maya', colorClass: 'text-dept-exec', bgClass: 'bg-dept-exec', borderClass: 'border-dept-exec', isDepartment: false },
  { id: 'dev', name: 'Development', leadId: 'noor', colorClass: 'text-dept-dev', bgClass: 'bg-dept-dev', borderClass: 'border-dept-dev', isDepartment: true },
  { id: 'mkt', name: 'Marketing', leadId: 'luca', colorClass: 'text-dept-mkt', bgClass: 'bg-dept-mkt', borderClass: 'border-dept-mkt', isDepartment: true },
  { id: 'sup', name: 'Support', leadId: 'kofi', colorClass: 'text-dept-sup', bgClass: 'bg-dept-sup', borderClass: 'border-dept-sup', isDepartment: true },
  { id: 'hr', name: 'HR', leadId: 'elena', colorClass: 'text-dept-hr', bgClass: 'bg-dept-hr', borderClass: 'border-dept-hr', isDepartment: true },
  { id: 'fin', name: 'Finance', leadId: 'nina', colorClass: 'text-dept-fin', bgClass: 'bg-dept-fin', borderClass: 'border-dept-fin', isDepartment: true },
]

export const deptById = (id: DeptId) => departments.find((d) => d.id === id)!

export type Employee = {
  id: string
  name: string
  fullName: string
  designation: string
  dept: DeptId
  email: string
  status: 'active' | 'inactive' | 'vacancy'
  location: string
  joined: string
  responsibilities: string[]
}

export const employees: Employee[] = [
  { id: 'maya', name: 'Maya', fullName: 'Maya Okafor', designation: 'Owner & Board Chair', dept: 'exec', email: 'maya@cometworks.example', status: 'active', location: 'Lisbon', joined: '2019-02-01', responsibilities: ['Company strategy', 'Board chair', 'Capital allocation'] },
  { id: 'ravi', name: 'Ravi', fullName: 'Ravi Menon', designation: 'Chief Executive Officer', dept: 'exec', email: 'ravi@cometworks.example', status: 'active', location: 'Lisbon', joined: '2019-06-12', responsibilities: ['Operating plan', 'Board member', 'Executive hiring'] },
  { id: 'noor', name: 'Noor', fullName: 'Noor Haddad', designation: 'Chief Technology Officer', dept: 'dev', email: 'noor@cometworks.example', status: 'active', location: 'Porto', joined: '2020-01-20', responsibilities: ['Engineering delivery', 'Technical review stage', 'Board member'] },
  { id: 'ana', name: 'Ana', fullName: 'Ana Ribeiro', designation: 'Software Developer', dept: 'dev', email: 'ana@cometworks.example', status: 'active', location: 'Porto', joined: '2022-09-05', responsibilities: ['Integrations development', 'API reliability', 'Code review'] },
  { id: 'priya', name: 'Priya', fullName: 'Priya Natarajan', designation: 'ML Engineer', dept: 'dev', email: 'priya@cometworks.example', status: 'active', location: 'Remote', joined: '2023-03-14', responsibilities: ['OCR models', 'Evaluation datasets'] },
  { id: 'omar', name: 'Omar', fullName: 'Omar Siddiqui', designation: 'QA Engineer', dept: 'dev', email: 'omar@cometworks.example', status: 'active', location: 'Porto', joined: '2024-01-08', responsibilities: ['Release testing', 'Test evidence'] },
  { id: 'luca', name: 'Luca', fullName: 'Luca Bianchi', designation: 'Product Marketing Manager', dept: 'mkt', email: 'luca@cometworks.example', status: 'active', location: 'Milan', joined: '2021-05-17', responsibilities: ['Launch planning', 'Project manager — Launch Reader v2', 'Positioning'] },
  { id: 'jules', name: 'Jules', fullName: 'Jules Laurent', designation: 'Content Lead', dept: 'mkt', email: 'jules@cometworks.example', status: 'active', location: 'Remote', joined: '2023-07-03', responsibilities: ['Launch content', 'Website copy'] },
  { id: 'kofi', name: 'Kofi', fullName: 'Kofi Mensah', designation: 'Support Lead', dept: 'sup', email: 'kofi@cometworks.example', status: 'active', location: 'Lisbon', joined: '2021-11-01', responsibilities: ['Support operations', 'Escalations'] },
  { id: 'sam', name: 'Sam', fullName: 'Sam Carter', designation: 'Support Specialist', dept: 'sup', email: 'sam@cometworks.example', status: 'active', location: 'Lisbon', joined: '2023-02-20', responsibilities: ['Tier 2 support', 'Customer feedback synthesis'] },
  { id: 'lin', name: 'Lin', fullName: 'Lin Zhao', designation: 'Support Specialist', dept: 'sup', email: 'lin@cometworks.example', status: 'active', location: 'Remote', joined: '2024-04-15', responsibilities: ['Tier 1 support'] },
  { id: 'elena', name: 'Elena', fullName: 'Elena Petrova', designation: 'Head of HR', dept: 'hr', email: 'elena@cometworks.example', status: 'active', location: 'Lisbon', joined: '2020-08-10', responsibilities: ['People operations', 'Announcements', 'Complaint committee (explicit case role)'] },
  { id: 'ines', name: 'Inês', fullName: 'Inês Duarte', designation: 'HR Generalist', dept: 'hr', email: 'ines@cometworks.example', status: 'active', location: 'Lisbon', joined: '2024-06-01', responsibilities: ['Onboarding', 'HR administration'] },
  { id: 'nina', name: 'Nina', fullName: 'Nina Kowalski', designation: 'Finance Lead', dept: 'fin', email: 'nina@cometworks.example', status: 'active', location: 'Lisbon', joined: '2020-03-02', responsibilities: ['Expenses & reimbursements', 'Revenue reconciliation', 'Allocations'] },
  { id: 'tom', name: 'Tom', fullName: 'Tom Andersen', designation: 'Accountant', dept: 'fin', email: 'tom@cometworks.example', status: 'inactive', location: 'Remote', joined: '2022-01-10', responsibilities: ['Accounts payable'] },
  { id: 'vac_dev', name: 'Vacancy', fullName: 'Open position', designation: 'Senior Backend Engineer', dept: 'dev', email: '', status: 'vacancy', location: '—', joined: '—', responsibilities: [] },
]

export const empById = (id: string) => employees.find((e) => e.id === id)

export type RelType = 'direct' | 'project' | 'functional'
export type Relationship = { id: string; from: string; to: string; type: RelType; primary?: boolean; context?: string }

export const relationships: Relationship[] = [
  { id: 'rel_01', from: 'ravi', to: 'maya', type: 'direct', primary: true },
  { id: 'rel_02', from: 'noor', to: 'ravi', type: 'direct', primary: true },
  { id: 'rel_03', from: 'luca', to: 'ravi', type: 'direct', primary: true },
  { id: 'rel_04', from: 'kofi', to: 'ravi', type: 'direct', primary: true },
  { id: 'rel_05', from: 'elena', to: 'ravi', type: 'direct', primary: true },
  { id: 'rel_06', from: 'nina', to: 'ravi', type: 'direct', primary: true },
  { id: 'rel_07', from: 'ana', to: 'noor', type: 'direct', primary: true },
  { id: 'rel_08', from: 'ana', to: 'luca', type: 'project', context: 'PRJ-07 Launch Reader v2' },
  { id: 'rel_09', from: 'priya', to: 'noor', type: 'direct', primary: true },
  { id: 'rel_10', from: 'omar', to: 'noor', type: 'direct', primary: true },
  { id: 'rel_11', from: 'jules', to: 'luca', type: 'direct', primary: true },
  { id: 'rel_12', from: 'sam', to: 'kofi', type: 'direct', primary: true },
  { id: 'rel_13', from: 'lin', to: 'kofi', type: 'direct', primary: true },
  { id: 'rel_14', from: 'ines', to: 'elena', type: 'direct', primary: true },
  { id: 'rel_15', from: 'tom', to: 'nina', type: 'direct', primary: true },
  { id: 'rel_16', from: 'omar', to: 'luca', type: 'project', context: 'PRJ-07 Launch Reader v2' },
  { id: 'rel_17', from: 'sam', to: 'noor', type: 'functional', context: 'Product feedback loop' },
  { id: 'rel_18', from: 'vac_dev', to: 'noor', type: 'direct', primary: true },
]

export const relLabel: Record<RelType, string> = {
  direct: 'Direct manager',
  project: 'Project manager',
  functional: 'Functional / dotted line',
}

export type BusinessProduct = {
  business_product_service_id: string
  name: string
  kind: 'Product' | 'Service'
  stage: string
  ownerId: string
  summary: string
}

export const businessProducts: BusinessProduct[] = [
  { business_product_service_id: 'bps_orion_reader', name: 'Orion Receipt Reader', kind: 'Product', stage: 'Live · v1.8', ownerId: 'noor', summary: 'Receipt capture and extraction app for small accounting teams.' },
  { business_product_service_id: 'bps_ledger_sync', name: 'Comet Ledger Sync', kind: 'Product', stage: 'Beta', ownerId: 'noor', summary: 'Two-way sync between receipts and accounting ledgers.' },
  { business_product_service_id: 'bps_onboarding', name: 'Guided Onboarding', kind: 'Service', stage: 'Live', ownerId: 'kofi', summary: 'Paid setup service for accounting firms.' },
]

export type ActivityStatus = 'Not started' | 'In progress' | 'Blocked' | 'Submitted' | 'Accepted' | 'Reopened' | 'Cancelled'

export type Activity = {
  id: string
  title: string
  ownerId: string
  projectId: string | null
  dept: DeptId
  status: ActivityStatus
  originalDue: string
  revisedDue: string | null
  revisionReason?: string
  revision: number
  reviewerId: string
  dependsOn?: string
  blocker?: string
  evidence?: string
  backlogId?: string
}

export const initialActivities: Activity[] = [
  { id: 'ACT-1042', title: 'Connect accounting API', ownerId: 'ana', projectId: 'PRJ-07', dept: 'dev', status: 'Submitted', originalDue: '2026-10-30', revisedDue: '2026-11-06', revisionReason: 'Vendor sandbox credentials delayed (approved by Luca, 21 Oct)', revision: 4, reviewerId: 'noor', dependsOn: 'ACT-1038', evidence: 'PR #482 merged · Integration test run TR-219 (34/34 passing)', backlogId: 'BLI-88' },
  { id: 'ACT-1038', title: 'Handwriting OCR model v2 evaluation', ownerId: 'priya', projectId: 'PRJ-07', dept: 'dev', status: 'Accepted', originalDue: '2026-10-18', revisedDue: null, revision: 2, reviewerId: 'noor', evidence: 'Eval report EVR-12 · 91.4% field accuracy', backlogId: 'BLI-88' },
  { id: 'ACT-1047', title: 'Release test plan for Reader v2', ownerId: 'omar', projectId: 'PRJ-07', dept: 'dev', status: 'In progress', originalDue: '2026-11-10', revisedDue: null, revision: 1, reviewerId: 'noor', dependsOn: 'ACT-1042', backlogId: 'BLI-88' },
  { id: 'ACT-1051', title: 'Launch messaging and pricing page', ownerId: 'jules', projectId: 'PRJ-07', dept: 'mkt', status: 'Blocked', originalDue: '2026-11-04', revisedDue: null, revision: 3, reviewerId: 'luca', blocker: 'Waiting on final release scope (BLI-88 execution approval)' },
  { id: 'ACT-1019', title: 'Retry logic for ledger webhook', ownerId: 'ana', projectId: 'PRJ-05', dept: 'dev', status: 'Reopened', originalDue: '2026-10-02', revisedDue: null, revision: 3, reviewerId: 'noor', evidence: 'Reopened: edge case with duplicate webhook IDs (QA-77)' },
  { id: 'ACT-1008', title: 'Document API rate limits', ownerId: 'ana', projectId: 'PRJ-05', dept: 'dev', status: 'Accepted', originalDue: '2026-09-20', revisedDue: null, revision: 1, reviewerId: 'noor', evidence: 'Docs page DOC-31 v2 accepted' },
  { id: 'ACT-0996', title: 'Legacy CSV exporter', ownerId: 'ana', projectId: null, dept: 'dev', status: 'Cancelled', originalDue: '2026-09-12', revisedDue: null, revision: 2, reviewerId: 'noor', evidence: 'Cancelled by Noor — superseded by Ledger Sync' },
  { id: 'ACT-1055', title: 'Support macro refresh for Reader v2', ownerId: 'sam', projectId: 'PRJ-07', dept: 'sup', status: 'Not started', originalDue: '2026-11-14', revisedDue: null, revision: 1, reviewerId: 'kofi' },
  { id: 'ACT-1033', title: 'Quarterly onboarding survey', ownerId: 'ines', projectId: null, dept: 'hr', status: 'In progress', originalDue: '2026-11-01', revisedDue: null, revision: 1, reviewerId: 'elena' },
  { id: 'ACT-1029', title: 'Reconcile October revenue feed', ownerId: 'nina', projectId: null, dept: 'fin', status: 'In progress', originalDue: '2026-11-05', revisedDue: null, revision: 2, reviewerId: 'ravi' },
]

export type Project = {
  id: string
  name: string
  pmId: string
  sponsorId: string
  status: 'Active' | 'Planning' | 'Closing' | 'Closed'
  stage: string
  memberIds: string[]
  productIds: string[]
  backlogIds: string[]
  target: string
  health: 'On track' | 'At risk' | 'Blocked'
}

export const projects: Project[] = [
  { id: 'PRJ-07', name: 'Launch Reader v2', pmId: 'luca', sponsorId: 'noor', status: 'Active', stage: 'Build → Technical review', memberIds: ['luca', 'ana', 'priya', 'omar', 'jules', 'sam'], productIds: ['bps_orion_reader'], backlogIds: ['BLI-88', 'BLI-91'], target: '2026-11-28', health: 'At risk' },
  { id: 'PRJ-05', name: 'Ledger Sync onboarding', pmId: 'noor', sponsorId: 'ravi', status: 'Active', stage: 'Beta hardening', memberIds: ['noor', 'ana', 'kofi'], productIds: ['bps_ledger_sync'], backlogIds: ['BLI-74'], target: '2026-12-12', health: 'On track' },
  { id: 'PRJ-03', name: 'Support knowledge base v3', pmId: 'kofi', sponsorId: 'ravi', status: 'Closing', stage: 'Close-out evidence', memberIds: ['kofi', 'sam', 'lin', 'jules'], productIds: ['bps_orion_reader', 'bps_onboarding'], backlogIds: [], target: '2026-10-31', health: 'On track' },
]

export type BacklogItem = {
  id: string
  title: string
  productId: string
  originProposalId?: string
  benefit: string
  criteria: string[]
  targetPeriod: string
  ownerId: string
  teams: DeptId[]
  status: string
  projectIds: string[]
  approvalId?: string
  dependsOn?: string
}

export const backlog: BacklogItem[] = [
  { id: 'BLI-88', title: 'Handwritten receipt support', productId: 'bps_orion_reader', originProposalId: 'PRP-24', benefit: 'Reduce manual entry for handwritten receipts, the top support complaint theme (Q3).', criteria: ['≥ 90% field accuracy on handwriting eval set', 'Fallback to manual review under 70% confidence', 'Accounting API export includes handwritten source flag'], targetPeriod: 'Release 2026.11', ownerId: 'noor', teams: ['dev', 'mkt', 'sup'], status: 'Scope approved · Execution approval in stage 1', projectIds: ['PRJ-07'], approvalId: 'APR-320' },
  { id: 'BLI-91', title: 'Batch upload from mobile', productId: 'bps_orion_reader', benefit: 'Faster month-end capture.', criteria: ['Up to 50 receipts per batch', 'Resumable upload'], targetPeriod: 'Release 2026.11', ownerId: 'noor', teams: ['dev'], status: 'Approved', projectIds: ['PRJ-07'] },
  { id: 'BLI-74', title: 'Ledger conflict resolution UI', productId: 'bps_ledger_sync', benefit: 'Fewer sync support tickets.', criteria: ['Side-by-side diff', 'Audit of resolution'], targetPeriod: 'Release 2026.12', ownerId: 'noor', teams: ['dev', 'sup'], status: 'In delivery', projectIds: ['PRJ-05'] },
  { id: 'BLI-95', title: 'Multi-currency receipts', productId: 'bps_orion_reader', originProposalId: 'PRP-19', benefit: 'Support EU/UK clients with mixed currency receipts.', criteria: ['Detect currency', 'Store original and converted amount'], targetPeriod: 'Release 2027.01', ownerId: 'noor', teams: ['dev', 'fin'], status: 'Awaiting execution approval', projectIds: [] },
]

export type Decision = 'approved' | 'pending' | 'changes' | 'rejected' | 'inactive' | 'blocked'

export type ApprovalStage = {
  name: string
  mode: 'Concurrent ALL' | 'Ordered stage'
  decisions: { personId: string; decision: Decision; at?: string; note?: string }[]
}

export type ApprovalRound = {
  id: string
  itemType: 'Proposal' | 'Backlog item' | 'Expense' | 'Project stage' | 'Complaint resolution'
  itemId: string
  itemTitle: string
  revision: string
  round: number
  workflowVersion: string
  status: 'Pending' | 'Approved' | 'Changes requested' | 'Blocked — approver inactive' | 'Superseded' | 'Rejected'
  submittedBy: string
  submittedAt: string
  stages: ApprovalStage[]
  summary: string
  restricted?: boolean
  priorRounds?: { round: number; revision: string; status: string; note: string }[]
}

export const initialApprovals: ApprovalRound[] = [
  {
    id: 'APR-311', itemType: 'Proposal', itemId: 'PRP-24', itemTitle: 'Handwritten receipt support', revision: 'rev 3 · budget €55,000', round: 2, workflowVersion: 'Board of Directors v4', status: 'Pending', submittedBy: 'sam', submittedAt: '2026-10-21',
    stages: [{ name: 'Board of Directors', mode: 'Concurrent ALL', decisions: [
      { personId: 'maya', decision: 'approved', at: '2026-10-22 09:14' },
      { personId: 'noor', decision: 'approved', at: '2026-10-22 11:40' },
      { personId: 'ravi', decision: 'pending' },
    ] }],
    summary: 'Add handwriting recognition to Orion Receipt Reader. Target: EU accounting firms, 5–50 staff.',
    priorRounds: [{ round: 1, revision: 'rev 2 · budget €40,000', status: 'Superseded', note: 'Maya and Noor had approved. Budget materially changed to €55,000 → new round required; prior approvals kept as history only.' }],
  },
  {
    id: 'APR-298', itemType: 'Proposal', itemId: 'PRP-19', itemTitle: 'Multi-currency receipts', revision: 'rev 1 · budget €22,000', round: 1, workflowVersion: 'Board of Directors v4', status: 'Approved', submittedBy: 'nina', submittedAt: '2026-10-02',
    stages: [{ name: 'Board of Directors', mode: 'Concurrent ALL', decisions: [
      { personId: 'maya', decision: 'approved', at: '2026-10-03 10:02' },
      { personId: 'ravi', decision: 'approved', at: '2026-10-03 15:20' },
      { personId: 'noor', decision: 'approved', at: '2026-10-04 08:51' },
    ] }],
    summary: 'Detect and store original receipt currency with converted amount.',
  },
  {
    id: 'APR-320', itemType: 'Backlog item', itemId: 'BLI-88', itemTitle: 'Handwritten receipt support — execution scope', revision: 'rev 1', round: 1, workflowVersion: 'Release workflow v2', status: 'Pending', submittedBy: 'noor', submittedAt: '2026-10-23',
    stages: [
      { name: '1 · Technical review', mode: 'Ordered stage', decisions: [{ personId: 'noor', decision: 'pending' }] },
      { name: '2 · Release board', mode: 'Ordered stage', decisions: [
        { personId: 'maya', decision: 'blocked' }, { personId: 'ravi', decision: 'blocked' }, { personId: 'luca', decision: 'blocked' },
      ] },
    ],
    summary: 'Commit execution scope and release target 2026.11. Stage 2 cannot complete before stage 1.',
  },
  {
    id: 'APR-305', itemType: 'Expense', itemId: 'EXP-5521', itemTitle: 'Vendor workshop travel — Ana', revision: 'rev 1 · €640', round: 1, workflowVersion: 'Expense policy v3', status: 'Changes requested', submittedBy: 'ana', submittedAt: '2026-10-19',
    stages: [{ name: 'Finance review', mode: 'Concurrent ALL', decisions: [
      { personId: 'noor', decision: 'approved', at: '2026-10-19 16:10' },
      { personId: 'nina', decision: 'changes', at: '2026-10-20 09:30', note: 'Hotel receipt missing VAT number. Please attach the itemized invoice.' },
    ] }],
    summary: 'Train + hotel for Ledgerly API workshop. Self-approval blocked: Ana cannot approve own expense.',
  },
  {
    id: 'APR-317', itemType: 'Project stage', itemId: 'PRJ-03', itemTitle: 'Support KB v3 — close-out', revision: 'rev 2', round: 1, workflowVersion: 'Close-out v1', status: 'Blocked — approver inactive', submittedBy: 'kofi', submittedAt: '2026-10-16',
    stages: [{ name: 'Close-out sign-off', mode: 'Concurrent ALL', decisions: [
      { personId: 'ravi', decision: 'approved', at: '2026-10-17 12:00' },
      { personId: 'tom', decision: 'inactive', note: 'Deactivated 18 Oct. Awaiting authorized replacement with reason — denominator stays 2.' },
    ] }],
    summary: 'Close-out evidence: final cost reconciliation and KB adoption report.',
  },
  {
    id: 'APR-322', itemType: 'Complaint resolution', itemId: 'CMP-0107', itemTitle: 'Restricted complaint case', revision: 'rev 1', round: 1, workflowVersion: 'Complaint committee v2', status: 'Pending', submittedBy: 'elena', submittedAt: '2026-10-24',
    stages: [{ name: 'Committee (conflict-safe)', mode: 'Concurrent ALL', decisions: [{ personId: 'elena', decision: 'pending' }] }],
    summary: 'Resolution sign-off. In-app only — no email notifications.', restricted: true,
  },
]

export const proposals = [
  { id: 'PRP-24', title: 'Handwritten receipt support', authorId: 'sam', status: 'In committee review · 2/3', geography: 'EU — Portugal, Spain, Italy', industry: 'Accounting & bookkeeping firms (5–50 staff)', budget: '€55,000', revision: 3, approvalId: 'APR-311', updated: '2026-10-21' },
  { id: 'PRP-19', title: 'Multi-currency receipts', authorId: 'nina', status: 'Approved · converted to BLI-95', geography: 'EU + UK', industry: 'Cross-border SMEs', budget: '€22,000', revision: 1, approvalId: 'APR-298', updated: '2026-10-04' },
  { id: 'PRP-27', title: 'Partner referral program', authorId: 'luca', status: 'Draft', geography: 'Portugal', industry: 'Accounting firms', budget: '€8,000', revision: 1, approvalId: null, updated: '2026-10-24' },
]

export type Expense = {
  id: string
  description: string
  amount: number
  vendor: string
  status: 'Draft' | 'Submitted' | 'Approved · unpaid' | 'Settled' | 'Changes requested' | 'Duplicate — held'
  dept: DeptId
  allocations: { productId: string; amount: number }[]
  projectId?: string
  source: string
  recurring?: string
  submittedBy: string
}

export const expenses: Expense[] = [
  { id: 'EXP-5510', description: 'Shared cloud hosting — October', amount: 1000, vendor: 'Nimbus Cloud', status: 'Settled', dept: 'dev', allocations: [{ productId: 'bps_orion_reader', amount: 600 }, { productId: 'bps_ledger_sync', amount: 400 }], source: 'INV-2207 · bank feed match', recurring: 'Monthly', submittedBy: 'nina' },
  { id: 'EXP-5511', description: 'Shared cloud hosting — October (re-import)', amount: 1000, vendor: 'Nimbus Cloud', status: 'Duplicate — held', dept: 'dev', allocations: [], source: 'INV-2207 · duplicate of EXP-5510', submittedBy: 'nina' },
  { id: 'EXP-5521', description: 'Vendor workshop travel', amount: 640, vendor: 'CP Rail / Hotel Aliados', status: 'Changes requested', dept: 'dev', allocations: [{ productId: 'bps_ledger_sync', amount: 640 }], projectId: 'PRJ-05', source: 'Receipt upload · 2 files', submittedBy: 'ana' },
  { id: 'EXP-5530', description: 'OCR labeling contractor — batch 3', amount: 2400, vendor: 'Labelworks', status: 'Approved · unpaid', dept: 'dev', allocations: [{ productId: 'bps_orion_reader', amount: 2400 }], projectId: 'PRJ-07', source: 'INV-LW-118', submittedBy: 'noor' },
  { id: 'EXP-5534', description: 'Launch ad campaign — pre-booking', amount: 1800, vendor: 'AdReach', status: 'Submitted', dept: 'mkt', allocations: [{ productId: 'bps_orion_reader', amount: 1800 }], projectId: 'PRJ-07', source: 'Quote Q-5521', submittedBy: 'luca' },
]

export const tickets = [
  { id: 'SUP-4821', subject: 'Handwritten totals not detected', product: 'bps_orion_reader', status: 'Open', priority: 'High', updated: '2026-10-24 17:02' },
  { id: 'SUP-4815', subject: 'Export to ledger duplicates line', product: 'bps_ledger_sync', status: 'Pending customer', priority: 'Medium', updated: '2026-10-24 11:40' },
  { id: 'SUP-4799', subject: 'Receipt photo upload times out on 4G', product: 'bps_orion_reader', status: 'Open', priority: 'Medium', updated: '2026-10-23 09:18' },
  { id: 'SUP-4772', subject: 'How to bulk re-tag receipts', product: 'bps_orion_reader', status: 'Solved', priority: 'Low', updated: '2026-10-21 14:55' },
]

export type MailMessage = {
  id: string
  folder: 'Inbox' | 'Sent'
  from: string
  to: string
  subject: string
  preview: string
  date: string
  attachments?: string[]
}

export const anaMail: MailMessage[] = [
  { id: 'msg_a91', folder: 'Inbox', from: 'Marta Ruiz <marta@ledgerly.example>', to: 'ana@cometworks.example', subject: 'Sandbox credentials for accounting API', preview: 'Hi Ana — your production-like sandbox is ready. Keys rotate every 30 days; webhooks require the X-Ledgerly-Signature header…', date: '2026-10-24 16:12', attachments: ['Ledgerly_API_v3_quickstart.pdf'] },
  { id: 'msg_a90', folder: 'Inbox', from: 'Noor Haddad <noor@cometworks.example>', to: 'ana@cometworks.example', subject: 'Re: ACT-1042 review slot', preview: 'I can review Thursday morning. Please include the TR-219 run link in the evidence field.', date: '2026-10-24 10:03' },
  { id: 'msg_a88', folder: 'Inbox', from: 'Nimbus Cloud <billing@nimbus.example>', to: 'ana@cometworks.example', subject: 'Usage alert: staging cluster at 80%', preview: 'Your staging cluster reached 80% of its monthly compute quota…', date: '2026-10-23 07:45' },
  { id: 'msg_a85', folder: 'Inbox', from: 'Marta Ruiz <marta@ledgerly.example>', to: 'ana@cometworks.example', subject: 'Workshop agenda — 18 Oct', preview: 'Attached is the agenda for the integration workshop in Porto.', date: '2026-10-15 13:20', attachments: ['Workshop_agenda.pdf', 'Venue_map.png'] },
  { id: 'msg_s44', folder: 'Sent', from: 'ana@cometworks.example', to: 'Marta Ruiz <marta@ledgerly.example>', subject: 'Re: Sandbox credentials for accounting API', preview: 'Thanks Marta — confirmed the signature header works. One question on idempotency keys for retries…', date: '2026-10-24 17:30' },
  { id: 'msg_s41', folder: 'Sent', from: 'ana@cometworks.example', to: 'Noor Haddad <noor@cometworks.example>', subject: 'ACT-1042 review slot', preview: 'Could you review the accounting API connector this week?', date: '2026-10-23 18:02' },
]

export const conversations = [
  { id: 'ch_prj07', name: '#prj-07-launch-reader-v2', context: 'PRJ-07', members: 6, unread: 3 },
  { id: 'ch_bli88', name: 'BLI-88 · Handwritten receipt support', context: 'BLI-88', members: 5, unread: 0 },
  { id: 'ch_reader', name: '#orion-receipt-reader', context: 'bps_orion_reader', members: 11, unread: 1 },
  { id: 'ch_dev', name: '#dept-development', context: 'dev', members: 5, unread: 0 },
]

export const messages = [
  { id: 'm1', channel: 'ch_prj07', authorId: 'luca', at: 'Thu 09:12', body: 'Demo for the Ledgerly team is set for 4 Nov. I added the meeting link and invited Marta as a limited external guest.' },
  { id: 'm2', channel: 'ch_prj07', authorId: 'ana', at: 'Thu 09:40', body: 'ACT-1042 submitted with TR-219 evidence. Revised due date was 6 Nov — we are ahead of it.' },
  { id: 'm3', channel: 'ch_prj07', authorId: 'noor', at: 'Thu 10:05', body: 'Decision: we ship handwriting behind a confidence threshold of 70% with manual-review fallback.', decision: 'DEC-14' },
  { id: 'm4', channel: 'ch_prj07', authorId: 'jules', at: 'Thu 11:22', body: 'Pricing page is blocked on final scope — waiting on APR-320.' },
]

export const documents = [
  { id: 'DOC-41', name: 'Reader v2 release plan.pdf', context: 'PRJ-07', version: 'v3', updated: '2026-10-22', by: 'luca', size: '1.2 MB', state: 'Indexed' },
  { id: 'DOC-38', name: 'Handwriting eval report EVR-12.pdf', context: 'PRJ-07', version: 'v1', updated: '2026-10-18', by: 'priya', size: '3.4 MB', state: 'Indexed' },
  { id: 'DOC-44', name: 'vendor_assets.zip', context: 'PRJ-07', version: '—', updated: '2026-10-24', by: 'jules', size: '48 MB', state: 'Refused — unsupported type' },
  { id: 'DOC-31', name: 'API rate limits.md', context: 'PRJ-05', version: 'v2', updated: '2026-09-21', by: 'ana', size: '18 KB', state: 'Indexed' },
]

export const decisions = [
  { id: 'DEC-14', title: 'Ship handwriting behind 70% confidence threshold', by: 'noor', at: '2026-10-23', source: 'm3 · #prj-07-launch-reader-v2', context: 'PRJ-07' },
  { id: 'DEC-11', title: 'Use Ledgerly API v3 for accounting connector', by: 'noor', at: '2026-10-09', source: 'Meeting MTG-09 notes', context: 'PRJ-07' },
]

export const meetings = [
  { id: 'MTG-12', title: 'Reader v2 vendor demo', context: 'PRJ-07', when: '2026-11-04 14:00 WET', link: 'https://meet.example.com/abc-defg-hij', organizer: 'luca', guests: ['Marta Ruiz (external · Ledgerly)'], type: 'Manual link' },
  { id: 'MTG-11', title: 'BLI-88 technical review', context: 'BLI-88', when: '2026-10-30 10:00 WET', link: 'https://meet.example.com/xyz-uvwq-rst', organizer: 'noor', guests: [], type: 'Manual link' },
]

export const announcements = [
  { id: 'ANN-33', title: 'Open enrollment for 2027 benefits', authorId: 'elena', audience: 'All employees (15)', channels: ['In-platform', 'Email via company sender'], status: 'Published', ack: '11 / 15 acknowledged', date: '2026-10-20' },
  { id: 'ANN-34', title: 'Reader v2 launch readiness', authorId: 'luca', audience: 'Development, Marketing, Support (10)', channels: ['In-platform'], status: 'Scheduled · 3 Nov 09:00', ack: 'Acknowledgment off', date: '2026-10-24' },
]

export const auditLog = [
  { id: 'AUD-9921', at: '2026-10-24 18:02', actor: 'maya', action: 'Role permission changed', target: 'Finance › Product reports → granted to Ravi', detail: 'Reason: board reporting' },
  { id: 'AUD-9918', at: '2026-10-24 12:10', actor: 'nina', action: 'Allocation approved', target: 'EXP-5510 → 600 Reader / 400 Ledger Sync', detail: 'Allocation policy AP-2' },
  { id: 'AUD-9910', at: '2026-10-23 09:01', actor: 'maya', action: 'Mailbox access attempt denied', target: 'Private mailbox (owner-only)', detail: 'No content returned · no override exists' },
  { id: 'AUD-9902', at: '2026-10-18 17:44', actor: 'elena', action: 'Employee deactivated', target: 'Tom Andersen', detail: 'Pending approvals flagged for replacement (APR-317)' },
  { id: 'AUD-9897', at: '2026-10-18 10:30', actor: 'maya', action: 'Committee version published', target: 'Board of Directors v4', detail: 'Applies to new rounds only' },
]

export const notifications = [
  { id: 'NTF-1', title: 'Your decision is needed on APR-311', body: 'Proposal PRP-24 · Board stage 2/3', href: '/approvals?id=APR-311', at: '2h ago', for: ['ravi'] },
  { id: 'NTF-2', title: 'Changes requested on EXP-5521', body: 'Nina: attach itemized hotel invoice', href: '/finance?tab=expenses', at: '5d ago', for: ['ana'] },
  { id: 'NTF-3', title: 'ACT-1042 submitted for review', body: 'Ana · Connect accounting API', href: '/activities?id=ACT-1042', at: '1d ago', for: ['noor', 'luca'] },
  { id: 'NTF-4', title: 'New case assigned (in-app only)', body: 'Restricted complaint · open case to view', href: '/complaints', at: '1d ago', for: ['elena'] },
  { id: 'NTF-5', title: 'Announcement: Open enrollment for 2027 benefits', body: 'Acknowledgment requested', href: '/communications/announcements', at: '5d ago', for: ['*'] },
  { id: 'NTF-6', title: 'APR-317 blocked — inactive approver', body: 'Tom deactivated · replacement needed', href: '/approvals?id=APR-317', at: '7d ago', for: ['maya', 'kofi'] },
  { id: 'NTF-7', title: 'Revenue feed is stale', body: 'Central revenue connector last refreshed 26h ago', href: '/settings/integrations', at: '3h ago', for: ['maya', 'nina'] },
]

export const finance = {
  period: 'October 2026',
  companyExpense: 7040,
  reader: { revenue: 10000, attributableExpense: 6000, contribution: 4000, hostingAllocation: 600 },
}

export const fmtEUR = (n: number) => new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
