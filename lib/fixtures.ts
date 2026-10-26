/**
 * Synthetic demonstration data and record types for the Company Operations Hub
 * prototype. All names, figures and records are invented. These records seed the
 * persisted prototype store (lib/store.tsx); every screen reads and mutates the
 * same records. Emergent: replace with company-scoped, permission-filtered APIs.
 */

import { enrichSample } from './sample-enrich'

export const TODAY = '2026-10-25'
export const PERIOD = { id: '2026-10', label: 'October 2026', short: 'Oct 2026' }

export type DeptColor = 'dev' | 'mkt' | 'sup' | 'hr' | 'fin' | 'exec'
export const deptColors: DeptColor[] = ['dev', 'mkt', 'sup', 'hr', 'fin', 'exec']
export const deptColorCls: Record<DeptColor, { text: string; bg: string; border: string }> = {
  dev: { text: 'text-dept-dev', bg: 'bg-dept-dev', border: 'border-dept-dev' },
  mkt: { text: 'text-dept-mkt', bg: 'bg-dept-mkt', border: 'border-dept-mkt' },
  sup: { text: 'text-dept-sup', bg: 'bg-dept-sup', border: 'border-dept-sup' },
  hr: { text: 'text-dept-hr', bg: 'bg-dept-hr', border: 'border-dept-hr' },
  fin: { text: 'text-dept-fin', bg: 'bg-dept-fin', border: 'border-dept-fin' },
  exec: { text: 'text-dept-exec', bg: 'bg-dept-exec', border: 'border-dept-exec' },
}

export type DeptId = string

export type Department = {
  id: DeptId
  name: string
  leadId: string | null
  color: DeptColor
  isDepartment: boolean
  purpose?: string
  /** Annual department budget in EUR (people + department-only expenses). */
  budget?: number
  /** budget: approve budget changes and department expenses. work: default reviewers of department-only activities. Empty = department lead. */
  approvers?: { budget: string[]; work: string[] }
  pendingBudget?: { approvalId: string; budget: number; reason: string; by: string; at: string }
  history?: { at: string; by: string; text: string }[]
}

export type AccessRole = 'owner' | 'admin' | 'finance' | 'hr' | 'manager' | 'member'
export const accessRoleLabel: Record<AccessRole, string> = {
  owner: 'Owner',
  admin: 'Administrator',
  finance: 'Finance manager',
  hr: 'HR publisher',
  manager: 'Manager',
  member: 'Employee',
}

export type Employee = {
  id: string
  fullName: string
  designation: string
  dept: DeptId
  email: string
  status: 'active' | 'inactive' | 'vacancy' | 'invited'
  location: string
  joined: string
  accessRole: AccessRole
  financeRead?: boolean
  complaintHandler?: boolean
  phone?: string
  dob?: string
  emergency?: string
  invitationId?: string
  /** Annual gross salary in EUR — drives project people cost. */
  salary?: number
  /** Performance-review goals agreed with the manager. */
  goals?: Goal[]
}

export type GoalStatus = 'On track' | 'At risk' | 'Achieved' | 'Missed'
export const goalStatuses: GoalStatus[] = ['On track', 'At risk', 'Achieved', 'Missed']
export type Goal = { id: string; title: string; measure: string; due: string; status: GoalStatus; setBy: string; setAt: string; note?: string }

export type RelType = 'direct' | 'project' | 'functional'
export type Relationship = { id: string; from: string; to: string; type: RelType; primary?: boolean; context?: string }
export const relLabel: Record<RelType, string> = { direct: 'Direct manager', project: 'Project manager', functional: 'Functional / dotted line' }

export type Responsibility = {
  id: string
  employeeId: string
  title: string
  description: string
  scope: string
  assignerId: string
  effective: string
  linkedWork?: string
  approvalRequired: boolean
  status: 'Active' | 'Removed'
  versions: { v: number; text: string; at: string; by: string; note: string }[]
}

export type Invitation = {
  id: string
  email: string
  name: string
  designation: string
  dept: DeptId
  managerId: string
  functionalId?: string
  start: string
  accessRole: AccessRole
  message: string
  status: 'Pending' | 'Accepted' | 'Cancelled' | 'Expired'
  createdAt: string
  createdBy: string
  expiresAt: string
  vacancyId?: string
  employeeId?: string
  history: { at: string; text: string }[]
}

export type ActivityStatus = 'Planned' | 'In progress' | 'Blocked' | 'Submitted for review' | 'Accepted' | 'Cancelled' | 'Reopened'
export const activityStatuses: ActivityStatus[] = ['Planned', 'In progress', 'Blocked', 'Submitted for review', 'Accepted', 'Cancelled', 'Reopened']

export type Activity = {
  id: string
  title: string
  outcome: string
  ownerId: string
  reviewerId: string
  dept: DeptId
  projectId: string | null
  productId: string | null
  /** What the activity is planned for. Older records infer it from projectId/productId. */
  scope?: 'department' | 'project' | 'product'
  backlogId?: string
  status: ActivityStatus
  priority: 'Low' | 'Medium' | 'High' | 'Critical'
  start?: string
  originalDue: string
  revisedDue: string | null
  revisionReason?: string
  revision: number
  dependsOn?: string
  blocker?: string
  evidence?: string
  checklist: { text: string; done: boolean }[]
  acceptedAt?: string
  reworkCount: number
  history: { at: string; by: string; text: string }[]
}

export type ProjectStage = { name: string; ownerId: string; needs: string; approverIds: string[]; approvalId?: string; status: 'Done' | 'Current' | 'Upcoming' }

export type Project = {
  id: string
  name: string
  purpose: string
  pmId: string
  sponsorId: string
  status: 'Planning' | 'Active' | 'Closing' | 'Closed'
  /** allocation = % of the person's working time spent on this project (default 100). */
  members: { personId: string; role: string; allocation?: number }[]
  formerMembers: { personId: string; role: string; until: string; allocation?: number }[]
  productIds: string[]
  ownerDept: DeptId
  deptIds: DeptId[]
  start: string
  target: string
  deliverables: string[]
  budget?: number
  /** budget: approve budget changes and project expenses. timeline: approve target date changes. Empty = sponsor. */
  approvers?: { budget: string[]; timeline: string[] }
  pendingChange?: { approvalId: string; budget?: number; target?: string; reason: string; by: string; at: string }
  stages: ProjectStage[]
  healthOverride?: { value: 'On track' | 'At risk' | 'Blocked'; reason: string; by: string; at: string }
  history: { at: string; by: string; text: string }[]
}

export type Client = { name: string; plan: string; seats: number; since: string; mrr: number }

export type BusinessProduct = {
  id: string
  name: string
  kind: 'Product' | 'Service'
  description: string
  ownerId: string
  dept: DeptId
  lifecycle: 'Idea' | 'In development' | 'Beta' | 'Live' | 'Sunset'
  currentReleaseId?: string
  targetCustomers: string
  clientDefinition: string
  clientSource: string
  clients: Client[]
  activeUsers: number
  billingSource: string
  costScope: string
  mappings: string
  /** Internal products carry the same delivery records but never recognise revenue. */
  revenueModel?: RevenueModel
  sources?: Partial<Record<SourceKind, SourceLink>>
  subscriptions?: SubscriptionEvent[]
}

export type SubscriptionEventType = 'New' | 'Upgrade' | 'Downgrade' | 'Renewal' | 'Cancelled'
export type SubscriptionEvent = { id: string; date: string; client: string; type: SubscriptionEventType; plan: string; seats: number; mrrChange: number; source: string }

export type RevenueModel = 'Revenue-generating' | 'Internal'
export type SourceKind = 'clients' | 'tickets' | 'revenue'
export type SourceMode = 'MCP' | 'Excel upload' | 'Manual'
export type SourceLink = { mode: SourceMode; connectorId?: string; mapping?: string; lastSync?: string; lastSyncBy?: string }

export type ConnectorProvider = 'Zoho CRM' | 'Zoho Desk' | 'Zoho Books' | 'Zendesk' | 'Freshdesk' | 'HubSpot' | 'Custom MCP'
export type Connector = {
  id: string
  name: string
  provider: ConnectorProvider
  url: string
  dataTypes: SourceKind[]
  status: 'Connected' | 'Disconnected'
  addedBy: string
  at: string
}

export const connectorProviders: { provider: ConnectorProvider; url: string; dataTypes: SourceKind[] }[] = [
  { provider: 'Zoho CRM', url: 'https://mcp.zoho.eu/crm', dataTypes: ['clients'] },
  { provider: 'Zoho Desk', url: 'https://mcp.zoho.eu/desk', dataTypes: ['tickets'] },
  { provider: 'Zoho Books', url: 'https://mcp.zoho.eu/books', dataTypes: ['revenue', 'clients'] },
  { provider: 'Zendesk', url: 'https://mcp.zendesk.com', dataTypes: ['tickets'] },
  { provider: 'Freshdesk', url: 'https://mcp.freshdesk.com', dataTypes: ['tickets'] },
  { provider: 'HubSpot', url: 'https://mcp.hubspot.com', dataTypes: ['clients'] },
  { provider: 'Custom MCP', url: '', dataTypes: [] },
]

export const defaultConnectors: Connector[] = [
  { id: 'mcp_zoho_crm', name: 'Zoho CRM', provider: 'Zoho CRM', url: 'https://mcp.zoho.eu/crm', dataTypes: ['clients'], status: 'Connected', addedBy: 'maya', at: '2026-09-01 10:00' },
  { id: 'mcp_zoho_desk', name: 'Zoho Desk', provider: 'Zoho Desk', url: 'https://mcp.zoho.eu/desk', dataTypes: ['tickets'], status: 'Connected', addedBy: 'maya', at: '2026-09-01 10:05' },
  { id: 'mcp_zoho_books', name: 'Zoho Books', provider: 'Zoho Books', url: 'https://mcp.zoho.eu/books', dataTypes: ['revenue', 'clients'], status: 'Connected', addedBy: 'nina', at: '2026-09-02 09:00' },
]

export type SupportTicket = { id: string; subject: string; product: string; status: string; priority: string; updated: string; body: string; source?: string }

export type Revenue = { id: string; productId: string; period: string; recognized: number; invoiced: number; collected: number; source: string; history: { at: string; by: string; text: string }[] }

export type BacklogStatus = 'Draft' | 'Submitted for approval' | 'Committed' | 'In delivery' | 'Done' | 'Changes requested' | 'Rejected'

export type BacklogItem = {
  id: string
  productId: string
  title: string
  problem: string
  description: string
  outcome: string
  criteria: string[]
  requesterId: string
  ownerId: string
  teams: DeptId[]
  dependencies: string
  priority: 'Low' | 'Medium' | 'High' | 'Critical'
  priorityRationale: string
  proposedTarget: string
  committedTarget?: string
  committedBy?: { ids: string[]; at: string }
  actualStart?: string
  actualDone?: string
  status: BacklogStatus
  approverIds: string[]
  approvalId?: string
  projectIds: string[]
  releaseId?: string
  originProposalId?: string
  history: { at: string; by: string; text: string }[]
}

export type Release = {
  id: string
  productId: string
  name: string
  target: string
  backlogIds: string[]
  ownerId: string
  testing: string
  testEvidence: string
  notes: string
  approverIds: string[]
  approvalId?: string
  status: 'Draft' | 'Planned' | 'Awaiting approval' | 'Approved' | 'Released'
  releasedAt?: string
  history: { at: string; by: string; text: string }[]
}

export type Decision = 'approved' | 'pending' | 'changes' | 'rejected' | 'inactive' | 'blocked'
export type ApprovalStage = { name: string; mode: 'Concurrent ALL' | 'Ordered stage'; decisions: { personId: string; decision: Decision; at?: string; note?: string }[] }
export type ApprovalType = 'Proposal' | 'Backlog item' | 'Expense' | 'Project stage' | 'Project change' | 'Department budget' | 'Activity acceptance' | 'Release' | 'Complaint resolution'

export type ApprovalRound = {
  id: string
  itemType: ApprovalType
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
  amount?: number
  restricted?: boolean
  priorRounds?: { round: number; revision: string; status: string; note: string }[]
  history: { at: string; by: string; text: string }[]
}

export type AnalysisReport = {
  rev: number
  generatedAt: string
  market: string
  competitors: { name: string; note: string }[]
  sources: { title: string; date: string }[]
  users: { low: number; base: number; high: number; assumption: string }
  adoption: string
  pricing: string
  steps: string
  staffing: string
  budget: string
  risks: string
  editedBy?: string
  editedAt?: string
  /** 'ai' = generated by the model through AI Gateway; 'simulated' = legacy sample report. */
  source?: 'ai' | 'simulated'
  summary?: string
  currentCustomers?: { count: number; description: string }
  newCustomers?: { low: number; base: number; high: number; assumption: string }
  marketingImpact?: string
  recommendation?: string
}

export type Proposal = {
  id: string
  title: string
  kind: 'Product' | 'Service' | 'Process'
  idea: string
  problem: string
  solution: string
  targetCustomer: string
  geography: string
  industry: string
  benefit: string
  marketingPlan?: string
  steps: string
  skills: string
  dependencies: string
  timeline: string
  risks: string
  docs: string[]
  budgetMode: 'cash' | 'effort' | 'none'
  budgetDev?: number
  budgetOngoing?: number
  budgetLow?: number
  budgetHigh?: number
  currency: string
  effort?: string
  authorId: string
  status: 'Draft' | 'Submitted' | 'Changes requested' | 'Approved' | 'Rejected' | 'Converted'
  revision: number
  revisions: { rev: number; at: string; by: string; note: string }[]
  analysis?: AnalysisReport
  approverMode: 'board' | 'named'
  approverIds: string[]
  approvalId?: string
  /** Existing product or service this proposal builds on; carried to the project on approval. */
  productId?: string
  converted?: { type: 'backlog' | 'project' | 'product'; id: string; at: string }
  updated: string
}

export type ExpenseStatus = 'Draft' | 'Submitted' | 'Approved · unpaid' | 'Paid' | 'Changes requested' | 'Duplicate — held' | 'Rejected'
export type ExpenseCategory = 'Hosting' | 'Tools & software' | 'Contractor' | 'Employee cost' | 'Travel' | 'Marketing' | 'Other'

export type Expense = {
  id: string
  description: string
  payee: string
  category: ExpenseCategory
  amount: number
  currency: string
  date: string
  dept: DeptId
  projectId?: string
  allocations: { productId: string; amount: number; kind: 'Delivery' | 'Operating' }[]
  approvalRequired: boolean
  approvalId?: string
  status: ExpenseStatus
  payment?: { at: string; by: string; method: string }
  receipt?: string
  recurring?: string
  submittedBy: string
  source: string
  history: { at: string; by: string; text: string }[]
}

export type ContextRef = { type: 'project' | 'department' | 'product'; id: string }
export const ctxKey = (c: ContextRef) => `${c.type}:${c.id}`

export type Message = { id: string; ctx: string; authorId: string; at: string; body: string; parentId?: string; attachments?: string[] }
export type Meeting = {
  id: string
  ctx: string
  title: string
  agenda: string
  date: string
  time: string
  tz: string
  duration: number
  attendeeIds: string[]
  external: string[]
  url: string
  organizerId: string
  status: 'Scheduled' | 'Cancelled'
  invitesSent?: boolean
  history: { at: string; by: string; text: string }[]
}
export type FileRecord = { id: string; ctx: string; name: string; kind: string; size: string; versions: { v: number; at: string; by: string; note: string }[]; source: 'Upload' | 'Link'; url?: string; dataUrl?: string; mime?: string }
export type DecisionRecord = { id: string; ctx: string; title: string; text: string; rationale: string; deciderId: string; at: string; related: string; createdBy: string }

export type Announcement = {
  id: string
  title: string
  body: string
  audience: { type: 'all' | 'depts'; deptIds: DeptId[] }
  image?: string
  attachments: string[]
  video?: string
  senderId: string
  ackRequired: boolean
  status: 'Published' | 'Scheduled' | 'Cancelled' | 'Delivery failed'
  scheduledAt?: string
  publishedAt?: string
  email: boolean
  acks: string[]
  history: { at: string; by: string; text: string }[]
}

export type Complaint = {
  id: string
  submitterId: string
  category: string
  summary: string
  details: string
  status: 'Received' | 'Under review' | 'Resolved'
  receivedAt: string
  notes: { at: string; by: string; text: string }[]
}

export type Committee = { id: string; name: string; memberIds: string[]; mode: 'Concurrent ALL' | 'Ordered stages'; version: number; appliesTo: string; history: { at: string; by: string; text: string }[] }
export type WorkflowDef = { id: string; name: string; appliesTo: ApprovalType; stages: { name: string; mode: 'Concurrent ALL' | 'Ordered stage'; approverIds: string[]; committeeId?: string }[]; version: number; history: { at: string; by: string; text: string }[] }

export type MailMessage = { id: string; folder: 'Inbox' | 'Sent'; from: string; to: string; subject: string; body: string; date: string; attachments?: string[]; archived?: boolean }

export type AuditEntry = { id: string; at: string; actor: string; action: string; target: string; detail: string }
export type ProductivityRequest = { id: string; personId: string; activityId?: string; text: string; status: 'Open' | 'Responded'; response?: string; responderId?: string; at: string }

export type Package = { id: string; name: string; interval: 'month' | 'year'; price: number; employees: number; aiCredits: number; limits: string[]; highlight?: boolean }

export const packages: Package[] = [
  { id: 'pkg_starter', name: 'Starter', interval: 'month', price: 49, employees: 10, aiCredits: 1000, limits: ['Organization chart & directory', 'Activities and projects', 'Personal read-only mail', '1 approval workflow'] },
  { id: 'pkg_growth', name: 'Growth', interval: 'month', price: 149, employees: 50, aiCredits: 5000, limits: ['Everything in Starter', 'Proposals with AI analysis', 'Products, backlog & releases', 'Unlimited workflows & committees'] },
  { id: 'pkg_business', name: 'Business', interval: 'month', price: 399, employees: 250, aiCredits: 10000, limits: ['Everything in Growth', 'Finance, allocation & product profit', 'Complaint committee case handling', 'Read-only support connectors'], highlight: true },
]

export type CompanyData = {
  id: string
  name: string
  industry: string
  country: string
  packageId: string
  onboarding: { done: boolean; step: number; skipped: string[] }
  credits: { limit: number; used: number; ops: string[] }
  seq: number
  departments: Department[]
  employees: Employee[]
  relationships: Relationship[]
  layout: Record<string, { x: number; y: number }>
  responsibilities: Responsibility[]
  invitations: Invitation[]
  activities: Activity[]
  projects: Project[]
  products: BusinessProduct[]
  revenue: Revenue[]
  backlog: BacklogItem[]
  releases: Release[]
  approvals: ApprovalRound[]
  proposals: Proposal[]
  expenses: Expense[]
  messages: Message[]
  meetings: Meeting[]
  files: FileRecord[]
  decisions: DecisionRecord[]
  announcements: Announcement[]
  complaints: Complaint[]
  committees: Committee[]
  workflows: WorkflowDef[]
  mailboxes: Record<string, MailMessage[]>
  audit: AuditEntry[]
  productivityRequests: ProductivityRequest[]
  connectors?: Connector[]
  supportTickets?: SupportTicket[]
}

export const tickets = [
  { id: 'SUP-4821', subject: 'Handwritten totals not detected', product: 'bps_orion_reader', status: 'Open', priority: 'High', updated: '2026-10-24 17:02', body: 'Customer reports handwritten totals on restaurant receipts are skipped; printed lines extract fine.' },
  { id: 'SUP-4815', subject: 'Export to ledger duplicates line', product: 'bps_ledger_sync', status: 'Pending customer', priority: 'Medium', updated: '2026-10-24 11:40', body: 'A single receipt line appears twice after re-sync. Awaiting customer export file.' },
  { id: 'SUP-4799', subject: 'Receipt photo upload times out on 4G', product: 'bps_orion_reader', status: 'Open', priority: 'Medium', updated: '2026-10-23 09:18', body: 'Large photos (>8 MB) time out on slow connections.' },
  { id: 'SUP-4772', subject: 'How to bulk re-tag receipts', product: 'bps_orion_reader', status: 'Solved', priority: 'Low', updated: '2026-10-21 14:55', body: 'Answered with help-center article KB-112.' },
]

export const fmtEUR = (n: number) => new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)

const h = (at: string, by: string, text: string) => ({ at, by, text })

const reader = 'bps_orion_reader'
const ledger = 'bps_ledger_sync'

function mail(id: string, folder: 'Inbox' | 'Sent', from: string, to: string, subject: string, body: string, date: string, attachments?: string[], archived?: boolean): MailMessage {
  return { id, folder, from, to, subject, body, date, attachments, archived }
}

const mailboxes: Record<string, MailMessage[]> = {
  maya: [
    mail('mm_101', 'Inbox', 'Ravi Menon <ravi@cometworks.example>', 'maya@cometworks.example', 'FY27 operating plan — final draft', 'Maya, attached is the final draft of the FY27 operating plan. Headcount stays at +4; the Reader v2 launch budget is unchanged from the board pack. Can we review before Thursday?', '2026-10-24 18:20', ['FY27_operating_plan_v5.pdf']),
    mail('mm_100', 'Inbox', 'Helena Costa <helena@lisbonvc.example>', 'maya@cometworks.example', 'Quarterly investor update', 'Thanks for the Q3 numbers. Could you add the active client count by product in the next update? Board members asked how Reader growth compares to Ledger Sync.', '2026-10-23 10:05'),
    mail('mm_098', 'Inbox', 'Nimbus Cloud <billing@nimbus.example>', 'maya@cometworks.example', 'Your October invoice INV-2207', 'Invoice INV-2207 for €1,000.00 (shared hosting) is available. Payment is due 10 November.', '2026-10-12 08:00', ['INV-2207.pdf']),
    mail('mm_097', 'Sent', 'maya@cometworks.example', 'Ravi Menon <ravi@cometworks.example>', 'Re: FY27 operating plan — final draft', 'Thursday 10:00 works. Please bring the hiring plan for the senior backend vacancy.', '2026-10-24 19:02'),
    mail('mm_095', 'Sent', 'maya@cometworks.example', 'Helena Costa <helena@lisbonvc.example>', 'Re: Quarterly investor update', 'Will do — Reader has 48 active client companies this month; we will report both product lines separately.', '2026-10-23 12:40'),
    mail('mm_060', 'Inbox', 'Ravi Menon <ravi@cometworks.example>', 'maya@cometworks.example', 'Board calendar 2026', 'Board meetings are confirmed for the last Thursday of each quarter.', '2026-01-08 09:00', undefined, true),
  ],
  ravi: [
    mail('mr_201', 'Inbox', 'Maya Okafor <maya@cometworks.example>', 'ravi@cometworks.example', 'Re: FY27 operating plan — final draft', 'Thursday 10:00 works. Please bring the hiring plan for the senior backend vacancy.', '2026-10-24 19:02'),
    mail('mr_200', 'Inbox', 'Labelworks <accounts@labelworks.example>', 'ravi@cometworks.example', 'Batch 3 delivered', 'The third labeling batch (12,000 receipts) has been delivered to your bucket.', '2026-10-21 15:30'),
    mail('mr_199', 'Sent', 'ravi@cometworks.example', 'Maya Okafor <maya@cometworks.example>', 'FY27 operating plan — final draft', 'Maya, attached is the final draft of the FY27 operating plan.', '2026-10-24 18:20', ['FY27_operating_plan_v5.pdf']),
    mail('mr_150', 'Inbox', 'Porto Tech Week <hello@ptw.example>', 'ravi@cometworks.example', 'Speaker confirmation', 'You are confirmed as a speaker for Porto Tech Week, 12 June.', '2026-03-02 11:00', undefined, true),
  ],
  noor: [
    mail('mn_301', 'Inbox', 'Ana Ribeiro <ana@cometworks.example>', 'noor@cometworks.example', 'ACT-1042 review slot', 'Could you review the accounting API connector this week?', '2026-10-23 18:02'),
    mail('mn_300', 'Inbox', 'GitHost <noreply@githost.example>', 'noor@cometworks.example', 'Security advisory for image-lib 4.2', 'A moderate advisory affects image-lib < 4.2.3. Two repositories are affected.', '2026-10-22 06:40'),
    mail('mn_299', 'Sent', 'noor@cometworks.example', 'Ana Ribeiro <ana@cometworks.example>', 'Re: ACT-1042 review slot', 'I can review Thursday morning. Please include the TR-219 run link in the evidence field.', '2026-10-24 10:03'),
    mail('mn_250', 'Inbox', 'Ledgerly <partners@ledgerly.example>', 'noor@cometworks.example', 'Partner API v3 roadmap', 'Ledgerly API v3 becomes generally available in Q3.', '2026-04-14 09:30', undefined, true),
  ],
  ana: [
    mail('msg_a91', 'Inbox', 'Marta Ruiz <marta@ledgerly.example>', 'ana@cometworks.example', 'Sandbox credentials for accounting API', 'Hi Ana — your production-like sandbox is ready. Keys rotate every 30 days; webhooks require the X-Ledgerly-Signature header. The quickstart is attached.', '2026-10-24 16:12', ['Ledgerly_API_v3_quickstart.pdf']),
    mail('msg_a90', 'Inbox', 'Noor Haddad <noor@cometworks.example>', 'ana@cometworks.example', 'Re: ACT-1042 review slot', 'I can review Thursday morning. Please include the TR-219 run link in the evidence field.', '2026-10-24 10:03'),
    mail('msg_a88', 'Inbox', 'Nimbus Cloud <billing@nimbus.example>', 'ana@cometworks.example', 'Usage alert: staging cluster at 80%', 'Your staging cluster reached 80% of its monthly compute quota.', '2026-10-23 07:45'),
    mail('msg_s44', 'Sent', 'ana@cometworks.example', 'Marta Ruiz <marta@ledgerly.example>', 'Re: Sandbox credentials for accounting API', 'Thanks Marta — confirmed the signature header works. One question on idempotency keys for retries.', '2026-10-24 17:30'),
    mail('msg_s41', 'Sent', 'ana@cometworks.example', 'Noor Haddad <noor@cometworks.example>', 'ACT-1042 review slot', 'Could you review the accounting API connector this week?', '2026-10-23 18:02'),
    mail('msg_a40', 'Inbox', 'Marta Ruiz <marta@ledgerly.example>', 'ana@cometworks.example', 'Workshop agenda — sandbox onboarding', 'Attached is the agenda for the integration workshop in Porto.', '2026-05-15 13:20', ['Workshop_agenda.pdf'], true),
  ],
  elena: [
    mail('me_401', 'Inbox', 'BenefitsCo <service@benefitsco.example>', 'elena@cometworks.example', '2027 plan documents', 'The 2027 benefits plan documents are ready for distribution to employees.', '2026-10-19 09:00', ['2027_benefits_summary.pdf']),
    mail('me_400', 'Inbox', 'Inês Duarte <ines@cometworks.example>', 'elena@cometworks.example', 'Onboarding survey draft', 'Draft questions are in the shared folder. Ten questions, five minutes.', '2026-10-22 14:10'),
    mail('me_399', 'Sent', 'elena@cometworks.example', 'Inês Duarte <ines@cometworks.example>', 'Re: Onboarding survey draft', 'Looks good. Please cut question 7 and send on 1 Nov.', '2026-10-22 16:45'),
    mail('me_300', 'Inbox', 'Lisbon HR Forum <info@hrforum.example>', 'elena@cometworks.example', 'Annual conference', 'Registration for the annual HR forum is open.', '2026-02-11 10:00', undefined, true),
  ],
  nina: [
    mail('mf_501', 'Inbox', 'Nimbus Cloud <billing@nimbus.example>', 'nina@cometworks.example', 'Your October invoice INV-2207', 'Invoice INV-2207 for €1,000.00 (shared hosting) is available.', '2026-10-12 08:00', ['INV-2207.pdf']),
    mail('mf_500', 'Inbox', 'Labelworks <accounts@labelworks.example>', 'nina@cometworks.example', 'Invoice INV-LW-118', 'Invoice for labeling batch 3: €2,400.00, due 15 November.', '2026-10-21 15:40', ['INV-LW-118.pdf']),
    mail('mf_499', 'Sent', 'nina@cometworks.example', 'Ana Ribeiro <ana@cometworks.example>', 'EXP-5521 receipt', 'Hi Ana, the hotel receipt is missing the VAT number. Could you attach the itemized invoice?', '2026-10-20 09:32'),
    mail('mf_400', 'Inbox', 'Tax Office <noreply@tax.example>', 'nina@cometworks.example', 'Q1 VAT filing received', 'Your Q1 VAT filing has been received.', '2026-04-20 08:00', undefined, true),
  ],
  sam: [
    mail('ms_601', 'Inbox', 'Kofi Mensah <kofi@cometworks.example>', 'sam@cometworks.example', 'Macro refresh for Reader v2', 'Can you draft the new support macros once the Reader v2 scope is final?', '2026-10-24 12:00'),
    mail('ms_600', 'Inbox', 'Customer <ops@fiscalfirm.example>', 'sam@cometworks.example', 'Handwritten receipts again', 'We still see handwritten totals being skipped. Any update?', '2026-10-24 08:12'),
    mail('ms_599', 'Sent', 'sam@cometworks.example', 'Customer <ops@fiscalfirm.example>', 'Re: Handwritten receipts again', 'Thanks — the product team is working on handwriting support; we will update you when it ships.', '2026-10-24 09:00'),
    mail('ms_500', 'Inbox', 'Kofi Mensah <kofi@cometworks.example>', 'sam@cometworks.example', 'Welcome to support', 'Welcome aboard! Your first week plan is attached.', '2023-02-20 09:00', ['First_week.pdf'], true),
  ],
  luca: [
    mail('ml_701', 'Inbox', 'AdReach <sales@adreach.example>', 'luca@cometworks.example', 'Campaign pre-booking confirmed', 'Your November campaign slot is reserved.', '2026-10-20 13:00'),
    mail('ml_700', 'Sent', 'luca@cometworks.example', 'Marta Ruiz <marta@ledgerly.example>', 'Reader v2 vendor demo', 'Inviting you to the Reader v2 demo on 4 Nov. Link to follow.', '2026-10-22 10:00'),
  ],
}

const emp = (e: Partial<Employee> & Pick<Employee, 'id' | 'fullName' | 'designation' | 'dept' | 'email' | 'location' | 'joined'>): Employee => ({ status: 'active', accessRole: 'member', ...e })

const act = (a: Partial<Activity> & Pick<Activity, 'id' | 'title' | 'ownerId' | 'reviewerId' | 'dept' | 'status' | 'originalDue'>): Activity => ({
  outcome: '',
  projectId: null,
  productId: null,
  priority: 'Medium',
  revisedDue: null,
  revision: 1,
  checklist: [],
  reworkCount: 0,
  history: [],
  ...a,
})

const resp = (id: string, employeeId: string, title: string, description: string, scope: string, assignerId: string, effective: string, linkedWork?: string): Responsibility => ({
  id,
  employeeId,
  title,
  description,
  scope,
  assignerId,
  effective,
  linkedWork,
  approvalRequired: false,
  status: 'Active',
  versions: [{ v: 1, text: description, at: `${effective} 09:00`, by: assignerId, note: 'Assigned' }],
})

export function demoCompany(): CompanyData {
  return enrichSample({
    id: 'co_comet_works',
    name: 'Comet Works',
    industry: 'Accounting software',
    country: 'Portugal',
    packageId: 'pkg_business',
    onboarding: { done: true, step: 5, skipped: [] },
    credits: { limit: 10000, used: 7420, ops: [] },
    seq: 100,
    departments: [
      { id: 'exec', name: 'Leadership', leadId: 'maya', color: 'exec', isDepartment: false, purpose: 'Company direction and board' },
      { id: 'dev', name: 'Development', leadId: 'noor', color: 'dev', isDepartment: true, purpose: 'Builds and operates Reader and Ledger Sync', budget: 9000 },
      { id: 'mkt', name: 'Marketing', leadId: 'luca', color: 'mkt', isDepartment: true, purpose: 'Positioning, launches and content', budget: 3000 },
      { id: 'sup', name: 'Support', leadId: 'kofi', color: 'sup', isDepartment: true, purpose: 'Customer support and onboarding service', budget: 3500 },
      { id: 'hr', name: 'HR', leadId: 'elena', color: 'hr', isDepartment: true, purpose: 'People operations' },
      { id: 'fin', name: 'Finance', leadId: 'nina', color: 'fin', isDepartment: true, purpose: 'Expenses, revenue and reporting' },
    ],
    employees: [
      emp({ id: 'maya', fullName: 'Maya Okafor', designation: 'Owner & Board Chair', dept: 'exec', email: 'maya@cometworks.example', location: 'Lisbon', joined: '2019-02-01', accessRole: 'owner', financeRead: true, phone: '+351 912 000 101', dob: '1984-03-14', emergency: 'Daniel Okafor (spouse) · +351 912 000 199' }),
      emp({ id: 'ravi', fullName: 'Ravi Menon', designation: 'Chief Executive Officer', dept: 'exec', email: 'ravi@cometworks.example', location: 'Lisbon', joined: '2019-06-12', accessRole: 'admin', financeRead: true, phone: '+351 912 000 102', dob: '1981-11-02', emergency: 'Leela Menon (sister) · +44 7700 900 102' }),
      emp({ id: 'noor', fullName: 'Noor Haddad', designation: 'Chief Technology Officer', dept: 'dev', email: 'noor@cometworks.example', location: 'Porto', joined: '2020-01-20', accessRole: 'manager', phone: '+351 913 000 103', dob: '1987-07-21', emergency: 'Sami Haddad (brother) · +351 913 000 193' }),
      emp({ id: 'ana', fullName: 'Ana Ribeiro', designation: 'Software Developer', dept: 'dev', email: 'ana@cometworks.example', location: 'Porto', joined: '2022-09-05', phone: '+351 914 000 104', dob: '1995-05-09', emergency: 'Rui Ribeiro (father) · +351 914 000 194' }),
      emp({ id: 'priya', fullName: 'Priya Natarajan', designation: 'ML Engineer', dept: 'dev', email: 'priya@cometworks.example', location: 'Remote', joined: '2023-03-14', phone: '+351 915 000 105', dob: '1992-01-30', emergency: 'Arun Natarajan · +91 98 0000 0105' }),
      emp({ id: 'omar', fullName: 'Omar Siddiqui', designation: 'QA Engineer', dept: 'dev', email: 'omar@cometworks.example', location: 'Porto', joined: '2024-01-08', phone: '+351 916 000 106', dob: '1993-09-17', emergency: 'Hana Siddiqui · +351 916 000 196' }),
      emp({ id: 'luca', fullName: 'Luca Bianchi', designation: 'Product Marketing Manager', dept: 'mkt', email: 'luca@cometworks.example', location: 'Milan', joined: '2021-05-17', accessRole: 'manager', phone: '+39 320 000 0107', dob: '1989-12-04', emergency: 'Giulia Bianchi · +39 320 000 0197' }),
      emp({ id: 'jules', fullName: 'Jules Laurent', designation: 'Content Lead', dept: 'mkt', email: 'jules@cometworks.example', location: 'Remote', joined: '2023-07-03', phone: '+33 6 00 00 01 08', dob: '1994-02-25', emergency: 'Claire Laurent · +33 6 00 00 01 98' }),
      emp({ id: 'kofi', fullName: 'Kofi Mensah', designation: 'Support Lead', dept: 'sup', email: 'kofi@cometworks.example', location: 'Lisbon', joined: '2021-11-01', accessRole: 'manager', phone: '+351 917 000 109', dob: '1988-06-11', emergency: 'Ama Mensah · +351 917 000 199' }),
      emp({ id: 'sam', fullName: 'Sam Carter', designation: 'Support Specialist', dept: 'sup', email: 'sam@cometworks.example', location: 'Lisbon', joined: '2023-02-20', phone: '+351 918 000 110', dob: '1997-10-03', emergency: 'Jo Carter · +44 7700 900 110' }),
      emp({ id: 'lin', fullName: 'Lin Zhao', designation: 'Support Specialist', dept: 'sup', email: 'lin@cometworks.example', location: 'Remote', joined: '2024-04-15', phone: '+351 919 000 111', dob: '1996-08-19', emergency: 'Wei Zhao · +86 138 0000 0111' }),
      emp({ id: 'elena', fullName: 'Elena Petrova', designation: 'Head of HR', dept: 'hr', email: 'elena@cometworks.example', location: 'Lisbon', joined: '2020-08-10', accessRole: 'hr', complaintHandler: true, phone: '+351 911 000 112', dob: '1985-04-28', emergency: 'Ivan Petrov · +351 911 000 192' }),
      emp({ id: 'ines', fullName: 'Inês Duarte', designation: 'HR Generalist', dept: 'hr', email: 'ines@cometworks.example', location: 'Lisbon', joined: '2024-06-01', phone: '+351 911 000 113', dob: '1998-12-12', emergency: 'Marta Duarte · +351 911 000 193' }),
      emp({ id: 'nina', fullName: 'Nina Kowalski', designation: 'Finance Lead', dept: 'fin', email: 'nina@cometworks.example', location: 'Lisbon', joined: '2020-03-02', accessRole: 'finance', financeRead: true, phone: '+351 912 000 114', dob: '1986-09-09', emergency: 'Piotr Kowalski · +48 600 000 114' }),
      emp({ id: 'tom', fullName: 'Tom Andersen', designation: 'Accountant', dept: 'fin', email: 'tom@cometworks.example', status: 'inactive', location: 'Remote', joined: '2022-01-10' }),
      emp({ id: 'vac_dev', fullName: 'Open position', designation: 'Senior Backend Engineer', dept: 'dev', email: '', status: 'vacancy', location: '—', joined: '—' }),
    ],
    relationships: [
      { id: 'rel_01', from: 'ravi', to: 'maya', type: 'direct', primary: true },
      { id: 'rel_02', from: 'noor', to: 'ravi', type: 'direct', primary: true },
      { id: 'rel_03', from: 'luca', to: 'ravi', type: 'direct', primary: true },
      { id: 'rel_04', from: 'kofi', to: 'ravi', type: 'direct', primary: true },
      { id: 'rel_05', from: 'elena', to: 'ravi', type: 'direct', primary: true },
      { id: 'rel_06', from: 'nina', to: 'ravi', type: 'direct', primary: true },
      { id: 'rel_07', from: 'ana', to: 'noor', type: 'direct', primary: true },
      { id: 'rel_08', from: 'ana', to: 'luca', type: 'project', context: 'Launch Reader v2' },
      { id: 'rel_09', from: 'priya', to: 'noor', type: 'direct', primary: true },
      { id: 'rel_10', from: 'omar', to: 'noor', type: 'direct', primary: true },
      { id: 'rel_11', from: 'jules', to: 'luca', type: 'direct', primary: true },
      { id: 'rel_12', from: 'sam', to: 'kofi', type: 'direct', primary: true },
      { id: 'rel_13', from: 'lin', to: 'kofi', type: 'direct', primary: true },
      { id: 'rel_14', from: 'ines', to: 'elena', type: 'direct', primary: true },
      { id: 'rel_15', from: 'tom', to: 'nina', type: 'direct', primary: true },
      { id: 'rel_16', from: 'omar', to: 'luca', type: 'project', context: 'Launch Reader v2' },
      { id: 'rel_17', from: 'sam', to: 'noor', type: 'functional', context: 'Product feedback loop' },
      { id: 'rel_18', from: 'vac_dev', to: 'noor', type: 'direct', primary: true },
    ],
    layout: {},
    responsibilities: [
      resp('RSP-01', 'maya', 'Company strategy', 'Set annual strategy and capital allocation with the board.', 'Annual plan approved by the board', 'maya', '2019-02-01'),
      resp('RSP-02', 'ravi', 'Operating plan', 'Own the operating plan and executive hiring.', 'Quarterly plan delivered on time', 'maya', '2019-06-12'),
      resp('RSP-03', 'noor', 'Engineering delivery', 'Lead engineering delivery and technical review for all releases.', 'Releases pass technical review', 'ravi', '2020-01-20'),
      resp('RSP-04', 'ana', 'Integrations development', 'Build and maintain accounting integrations for Reader and Ledger Sync.', 'Integrations meet acceptance criteria and API reliability targets', 'noor', '2022-09-05', 'ACT-1042'),
      resp('RSP-05', 'ana', 'Code review', 'Review pull requests for the integrations area within two working days.', 'Reviews completed within SLA', 'noor', '2023-01-10'),
      resp('RSP-06', 'elena', 'People operations & announcements', 'Run people operations and publish company announcements.', 'Announcements delivered and acknowledged', 'ravi', '2020-08-10'),
      resp('RSP-07', 'nina', 'Expenses & reconciliation', 'Approve expenses, record payments and reconcile revenue feeds.', 'Monthly close by working day 5', 'ravi', '2020-03-02', 'ACT-1029'),
    ],
    invitations: [
      { id: 'INV-0007', email: 'diego@cometworks.example', name: 'Diego Ferreira', designation: 'Senior Backend Engineer', dept: 'dev', managerId: 'noor', start: '2026-11-16', accessRole: 'member', message: 'Welcome to the Development team!', status: 'Pending', createdAt: '2026-10-22 11:00', createdBy: 'elena', expiresAt: '2026-11-05', vacancyId: 'vac_dev', history: [h('2026-10-22 11:00', 'elena', 'Invitation created')] },
    ],
    activities: [
      act({ id: 'ACT-1042', title: 'Connect accounting API', outcome: 'Receipts export to Ledgerly with signed webhooks', ownerId: 'ana', reviewerId: 'noor', dept: 'dev', projectId: 'PRJ-07', productId: reader, backlogId: 'BLI-88', status: 'Submitted for review', priority: 'High', originalDue: '2026-10-30', revisedDue: '2026-11-06', revisionReason: 'Vendor sandbox credentials delayed (agreed with Luca, 21 Oct)', revision: 4, dependsOn: 'ACT-1038', evidence: 'PR #482 merged · Integration test run TR-219 (34/34 passing)', checklist: [{ text: 'Webhook signature verified', done: true }, { text: 'Retry with idempotency keys', done: true }, { text: 'Integration tests green', done: true }], history: [h('2026-10-21 10:00', 'luca', 'Due date revised 30 Oct → 6 Nov: vendor sandbox delay'), h('2026-10-24 09:40', 'ana', 'Submitted for review with TR-219 evidence')] }),
      act({ id: 'ACT-1038', title: 'Handwriting OCR model v2 evaluation', outcome: '≥ 90% field accuracy on eval set', ownerId: 'priya', reviewerId: 'noor', dept: 'dev', projectId: 'PRJ-07', productId: reader, backlogId: 'BLI-88', status: 'Accepted', priority: 'High', originalDue: '2026-10-18', revision: 2, evidence: 'Eval report EVR-12 · 91.4% field accuracy', acceptedAt: '2026-10-17', history: [h('2026-10-17 15:00', 'noor', 'Accepted — EVR-12 meets criteria')] }),
      act({ id: 'ACT-1047', title: 'Release test plan for Reader v2', outcome: 'Test plan covering handwriting and batch upload', ownerId: 'omar', reviewerId: 'noor', dept: 'dev', projectId: 'PRJ-07', productId: reader, backlogId: 'BLI-91', status: 'In progress', originalDue: '2026-11-10', dependsOn: 'ACT-1042' }),
      act({ id: 'ACT-1051', title: 'Launch messaging and pricing page', outcome: 'Pricing page and launch copy ready', ownerId: 'jules', reviewerId: 'luca', dept: 'mkt', projectId: 'PRJ-07', productId: reader, status: 'Blocked', priority: 'Critical', originalDue: '2026-10-24', revision: 3, blocker: 'Waiting on final release scope (BLI-88 execution approval)' }),
      act({ id: 'ACT-1019', title: 'Retry logic for ledger webhook', outcome: 'No duplicate ledger entries on webhook retry', ownerId: 'ana', reviewerId: 'noor', dept: 'dev', projectId: 'PRJ-05', productId: ledger, status: 'Reopened', originalDue: '2026-10-02', revision: 3, evidence: 'Reopened: edge case with duplicate webhook IDs (QA-77)', reworkCount: 1, history: [h('2026-10-02 12:00', 'ana', 'Submitted for review'), h('2026-10-06 10:00', 'noor', 'Reopened — duplicate webhook IDs (QA-77)')] }),
      act({ id: 'ACT-1061', title: 'Ledger Sync field mapping', outcome: 'Mapping for 14 ledger fields', ownerId: 'ana', reviewerId: 'noor', dept: 'dev', projectId: 'PRJ-05', productId: ledger, status: 'Accepted', originalDue: '2026-10-09', acceptedAt: '2026-10-08', evidence: 'PR #455 · mapping test suite', history: [h('2026-10-08 16:00', 'noor', 'Accepted')] }),
      act({ id: 'ACT-1062', title: 'Document API rate limits', outcome: 'Public rate-limit docs page', ownerId: 'ana', reviewerId: 'noor', dept: 'dev', projectId: 'PRJ-05', productId: ledger, status: 'Accepted', originalDue: '2026-10-16', acceptedAt: '2026-10-15', evidence: 'Docs page DOC-31 v2', history: [h('2026-10-15 11:00', 'noor', 'Accepted')] }),
      act({ id: 'ACT-1063', title: 'Sandbox credential rotation script', outcome: 'Automated 30-day key rotation', ownerId: 'ana', reviewerId: 'noor', dept: 'dev', projectId: null, productId: null, status: 'Accepted', originalDue: '2026-10-20', acceptedAt: '2026-10-22', evidence: 'Script merged in PR #470', history: [h('2026-10-22 09:00', 'noor', 'Accepted (2 days after agreed due date)')] }),
      act({ id: 'ACT-0996', title: 'Legacy CSV exporter', outcome: 'CSV export for legacy clients', ownerId: 'ana', reviewerId: 'noor', dept: 'dev', status: 'Cancelled', originalDue: '2026-10-12', revision: 2, evidence: 'Cancelled by Noor — superseded by Ledger Sync' }),
      act({ id: 'ACT-1055', title: 'Support macro refresh for Reader v2', outcome: 'Updated macros for v2 features', ownerId: 'sam', reviewerId: 'kofi', dept: 'sup', projectId: 'PRJ-07', productId: reader, status: 'Planned', originalDue: '2026-11-14' }),
      act({ id: 'ACT-1056', title: 'Tier 2 escalation review', outcome: 'Weekly escalation report', ownerId: 'sam', reviewerId: 'kofi', dept: 'sup', status: 'Submitted for review', originalDue: '2026-10-25', evidence: 'Report ESC-W43 uploaded' }),
      act({ id: 'ACT-1033', title: 'Quarterly onboarding survey', outcome: 'Survey sent to new joiners', ownerId: 'ines', reviewerId: 'elena', dept: 'hr', status: 'In progress', originalDue: '2026-11-01' }),
      act({ id: 'ACT-1029', title: 'Reconcile October revenue feed', outcome: 'Revenue feed matches invoices', ownerId: 'nina', reviewerId: 'ravi', dept: 'fin', status: 'In progress', originalDue: '2026-11-05', revision: 2 }),
      act({ id: 'ACT-1070', title: 'Board pack for November meeting', outcome: 'Board pack circulated a week ahead', ownerId: 'maya', reviewerId: 'ravi', dept: 'exec', status: 'In progress', originalDue: '2026-10-29' }),
      act({ id: 'ACT-1071', title: 'Approve FY27 hiring plan', outcome: 'Hiring plan signed off', ownerId: 'maya', reviewerId: 'ravi', dept: 'exec', status: 'Accepted', originalDue: '2026-10-15', acceptedAt: '2026-10-14', evidence: 'Board minutes BM-10' }),
      act({ id: 'ACT-1072', title: 'Development weekly planning', outcome: 'Sprint priorities agreed', ownerId: 'noor', reviewerId: 'ravi', dept: 'dev', status: 'Planned', originalDue: '2026-10-28' }),
    ],
    projects: [
      {
        id: 'PRJ-07', name: 'Launch Reader v2', purpose: 'Ship handwriting support and batch upload in Orion Receipt Reader v2.0 for EU accounting firms.', pmId: 'luca', sponsorId: 'noor', status: 'Active',
        members: [{ personId: 'luca', role: 'Project manager' }, { personId: 'ana', role: 'Developer' }, { personId: 'priya', role: 'ML engineer' }, { personId: 'omar', role: 'QA' }, { personId: 'jules', role: 'Content' }, { personId: 'sam', role: 'Support readiness' }],
        formerMembers: [], productIds: [reader], ownerDept: 'dev', deptIds: ['dev', 'mkt', 'sup'], start: '2026-09-01', target: '2026-11-28', deliverables: ['Handwriting extraction', 'Batch upload', 'Launch page', 'Support macros'], budget: 55000,
        stages: [
          { name: 'Discovery', ownerId: 'luca', needs: 'Approved proposal PRP-24', approverIds: [], status: 'Done' },
          { name: 'Build', ownerId: 'noor', needs: 'All build activities accepted', approverIds: ['noor'], status: 'Current' },
          { name: 'Launch readiness', ownerId: 'luca', needs: 'Test plan accepted, release approved', approverIds: ['noor', 'luca', 'ravi'], status: 'Upcoming' },
          { name: 'Close-out', ownerId: 'luca', needs: 'Final cost reconciliation', approverIds: ['ravi'], status: 'Upcoming' },
        ],
        history: [h('2026-09-01 09:00', 'luca', 'Project created')],
      },
      {
        id: 'PRJ-05', name: 'Ledger Sync onboarding', purpose: 'Harden Ledger Sync for the first 20 beta clients.', pmId: 'noor', sponsorId: 'ravi', status: 'Active',
        members: [{ personId: 'noor', role: 'Project manager' }, { personId: 'ana', role: 'Developer' }, { personId: 'kofi', role: 'Support lead' }],
        formerMembers: [], productIds: [ledger], ownerDept: 'dev', deptIds: ['dev', 'sup'], start: '2026-08-15', target: '2026-12-12', deliverables: ['Conflict resolution UI', 'Webhook reliability'],
        stages: [
          { name: 'Beta build', ownerId: 'noor', needs: 'Core sync accepted', approverIds: [], status: 'Done' },
          { name: 'Beta hardening', ownerId: 'noor', needs: 'Reopened issues resolved', approverIds: ['noor'], status: 'Current' },
          { name: 'General availability', ownerId: 'noor', needs: 'Release approval', approverIds: ['noor', 'ravi'], status: 'Upcoming' },
        ],
        history: [h('2026-08-15 09:00', 'noor', 'Project created')],
      },
    ],
    products: [
      {
        id: reader, name: 'Orion Receipt Reader', kind: 'Product', description: 'Receipt capture and extraction app for small accounting teams.', ownerId: 'noor', dept: 'dev', lifecycle: 'Live', currentReleaseId: 'REL-18',
        targetCustomers: 'Accounting & bookkeeping firms, 5–50 staff, EU', clientDefinition: 'Company with a paid, non-cancelled subscription during the period', clientSource: 'Billing system export (mock) · refreshed 25 Oct 06:00',
        clients: [
          { name: 'Fiscal Firm Lda', plan: 'Team', seats: 8, since: '2025-02-01', mrr: 320 },
          { name: 'Contas Claras', plan: 'Team', seats: 5, since: '2025-06-12', mrr: 200 },
          { name: 'Studio Ledger SL', plan: 'Pro', seats: 12, since: '2024-11-03', mrr: 600 },
          { name: 'Numeri & Co', plan: 'Team', seats: 4, since: '2026-01-20', mrr: 160 },
          { name: 'Brightbooks BV', plan: 'Pro', seats: 9, since: '2025-09-01', mrr: 450 },
        ],
        activeUsers: 126, billingSource: 'Subscription billing (mock)', costScope: 'Delivery: hosting allocation, labeling contractor, support staff allocation. Operating: product marketing allocation.', mappings: 'Billing plan group READER · support product tag reader',
      },
      {
        id: ledger, name: 'Comet Ledger Sync', kind: 'Product', description: 'Two-way sync between receipts and accounting ledgers.', ownerId: 'noor', dept: 'dev', lifecycle: 'Beta', currentReleaseId: 'REL-L03',
        targetCustomers: 'Firms using Ledgerly or similar ledgers', clientDefinition: 'Beta company with an active sync connection', clientSource: 'Beta roster (manual)',
        clients: [{ name: 'Fiscal Firm Lda', plan: 'Beta', seats: 3, since: '2026-08-20', mrr: 0 }, { name: 'Brightbooks BV', plan: 'Beta', seats: 2, since: '2026-09-02', mrr: 0 }],
        activeUsers: 11, billingSource: 'Not billed during beta', costScope: 'Delivery: hosting allocation, travel', mappings: 'Support tag ledger-sync',
      },
      {
        id: 'bps_onboarding', name: 'Guided Onboarding', kind: 'Service', description: 'Paid setup service for accounting firms adopting Reader.', ownerId: 'kofi', dept: 'sup', lifecycle: 'Live',
        targetCustomers: 'New Reader clients with 10+ staff', clientDefinition: 'Company with an onboarding engagement in the period', clientSource: 'Service engagement log',
        clients: [{ name: 'Studio Ledger SL', plan: 'Onboarding package', seats: 0, since: '2026-10-01', mrr: 0 }],
        activeUsers: 0, billingSource: 'One-off invoices', costScope: 'Support staff time', mappings: 'Invoice item ONB',
        revenueModel: 'Revenue-generating',
        sources: { clients: { mode: 'Manual' }, tickets: { mode: 'MCP', connectorId: 'mcp_zoho_desk', mapping: 'Department: Onboarding' }, revenue: { mode: 'MCP', connectorId: 'mcp_zoho_books', mapping: 'Item code ONB', lastSync: '2026-10-25 06:00' } },
      },
      {
        id: 'bps_ops_console', name: 'Comet Ops Console', kind: 'Product', description: 'Internal admin console the support and finance teams use to manage client accounts.', ownerId: 'noor', dept: 'dev', lifecycle: 'Live',
        targetCustomers: 'Internal — Support, Finance', clientDefinition: 'Internal team using the console', clientSource: 'Manual list',
        clients: [{ name: 'Support team', plan: 'Internal', seats: 4, since: '2025-03-01', mrr: 0 }, { name: 'Finance team', plan: 'Internal', seats: 2, since: '2025-03-01', mrr: 0 }],
        activeUsers: 6, billingSource: 'Not billed — internal', costScope: 'Delivery: hosting allocation, developer time', mappings: 'Support tag ops-console',
        revenueModel: 'Internal',
        sources: { clients: { mode: 'Manual' }, tickets: { mode: 'Excel upload' } },
      },
    ],
    revenue: [
      { id: 'REV-1001', productId: reader, period: '2026-10', recognized: 10000, invoiced: 10400, collected: 8900, source: 'Billing export BX-10 (mock)', history: [h('2026-10-25 06:00', 'nina', 'Imported from billing export')] },
      { id: 'REV-1002', productId: 'bps_onboarding', period: '2026-10', recognized: 1500, invoiced: 1500, collected: 0, source: 'Invoice INV-ONB-04', history: [h('2026-10-05 10:00', 'nina', 'Recorded manually')] },
    ],
    backlog: [
      { id: 'BLI-88', productId: reader, title: 'Handwritten receipt support', problem: 'Handwritten totals are skipped — the top support complaint theme in Q3.', description: 'Detect and extract handwritten totals and dates with a confidence threshold and manual-review fallback.', outcome: 'Reduce manual entry for handwritten receipts.', criteria: ['≥ 90% field accuracy on handwriting eval set', 'Fallback to manual review under 70% confidence', 'Accounting API export includes handwritten source flag'], requesterId: 'sam', ownerId: 'noor', teams: ['dev', 'mkt', 'sup'], dependencies: 'OCR model v2', priority: 'High', priorityRationale: 'Top support theme; blocks EU firm expansion', proposedTarget: '2026-11-28', status: 'Submitted for approval', approverIds: ['noor', 'maya', 'ravi', 'luca'], approvalId: 'APR-320', projectIds: ['PRJ-07'], releaseId: 'REL-20', history: [h('2026-10-23 09:00', 'noor', 'Submitted for execution approval')] },
      { id: 'BLI-91', productId: reader, title: 'Batch upload from mobile', problem: 'Month-end capture is slow, one receipt at a time.', description: 'Upload up to 50 receipts per batch with resumable upload.', outcome: 'Faster month-end capture.', criteria: ['Up to 50 receipts per batch', 'Resumable upload'], requesterId: 'kofi', ownerId: 'noor', teams: ['dev'], dependencies: '—', priority: 'Medium', priorityRationale: 'Requested by 12 clients', proposedTarget: '2026-11-28', committedTarget: '2026-11-28', committedBy: { ids: ['noor', 'ravi'], at: '2026-10-05 14:00' }, actualStart: '2026-10-06', status: 'In delivery', approverIds: ['noor', 'ravi'], projectIds: ['PRJ-07'], releaseId: 'REL-20', history: [h('2026-10-05 14:00', 'ravi', 'Committed target 28 Nov approved by Noor, Ravi')] },
      { id: 'BLI-74', productId: ledger, title: 'Ledger conflict resolution UI', problem: 'Sync conflicts generate support tickets.', description: 'Side-by-side diff with audited resolution.', outcome: 'Fewer sync support tickets.', criteria: ['Side-by-side diff', 'Audit of resolution'], requesterId: 'kofi', ownerId: 'noor', teams: ['dev', 'sup'], dependencies: '—', priority: 'High', priorityRationale: 'Beta exit criterion', proposedTarget: '2026-12-12', committedTarget: '2026-12-12', committedBy: { ids: ['noor', 'ravi'], at: '2026-09-10 11:00' }, actualStart: '2026-09-15', status: 'In delivery', approverIds: ['noor', 'ravi'], projectIds: ['PRJ-05'], history: [] },
    ],
    releases: [
      { id: 'REL-17', productId: reader, name: 'v1.7', target: '2026-07-15', backlogIds: [], ownerId: 'noor', testing: 'Regression suite', testEvidence: 'TR-160 passed', notes: 'Faster capture on Android; CSV export fixes.', approverIds: ['noor'], status: 'Released', releasedAt: '2026-07-14', history: [h('2026-07-14 17:00', 'noor', 'Released')] },
      { id: 'REL-18', productId: reader, name: 'v1.8', target: '2026-09-15', backlogIds: [], ownerId: 'noor', testing: 'Regression suite + accessibility pass', testEvidence: 'TR-201 passed', notes: 'Bulk re-tagging, improved VAT detection, accessibility fixes.', approverIds: ['noor'], status: 'Released', releasedAt: '2026-09-15', history: [h('2026-09-15 16:30', 'noor', 'Released')] },
      { id: 'REL-20', productId: reader, name: 'v2.0', target: '2026-11-28', backlogIds: ['BLI-88', 'BLI-91'], ownerId: 'noor', testing: 'Full regression, handwriting eval ≥ 90%, batch upload load test', testEvidence: '', notes: 'Handwriting support and mobile batch upload.', approverIds: ['noor', 'ravi'], status: 'Planned', history: [h('2026-10-10 10:00', 'noor', 'Release planned')] },
      { id: 'REL-L03', productId: ledger, name: 'v0.3 beta', target: '2026-09-30', backlogIds: [], ownerId: 'noor', testing: 'Beta smoke tests', testEvidence: 'TR-188', notes: 'Webhook reliability improvements.', approverIds: ['noor'], status: 'Released', releasedAt: '2026-09-29', history: [] },
    ],
    approvals: [
      {
        id: 'APR-311', itemType: 'Proposal', itemId: 'PRP-24', itemTitle: 'Supplier invoice inbox', revision: 'rev 3', round: 2, workflowVersion: 'Board of Directors v4', status: 'Pending', submittedBy: 'sam', submittedAt: '2026-10-21', amount: 55000,
        stages: [{ name: 'Board of Directors', mode: 'Concurrent ALL', decisions: [{ personId: 'maya', decision: 'approved', at: '2026-10-22 09:14' }, { personId: 'noor', decision: 'approved', at: '2026-10-22 11:40' }, { personId: 'ravi', decision: 'pending' }] }],
        summary: 'Forward supplier invoices to a company inbox and extract them like receipts.',
        priorRounds: [{ round: 1, revision: 'rev 2 · €40,000', status: 'Superseded', note: 'Budget changed to €55,000 → new round; prior approvals kept as history only.' }],
        history: [h('2026-10-21 10:00', 'sam', 'Submitted rev 3 to Board of Directors')],
      },
      {
        id: 'APR-320', itemType: 'Backlog item', itemId: 'BLI-88', itemTitle: 'Handwritten receipt support — execution scope', revision: 'rev 1', round: 1, workflowVersion: 'Release workflow v2', status: 'Pending', submittedBy: 'noor', submittedAt: '2026-10-23',
        stages: [
          { name: '1 · Technical review', mode: 'Ordered stage', decisions: [{ personId: 'noor', decision: 'pending' }] },
          { name: '2 · Release board', mode: 'Ordered stage', decisions: [{ personId: 'maya', decision: 'blocked' }, { personId: 'ravi', decision: 'blocked' }, { personId: 'luca', decision: 'blocked' }] },
        ],
        summary: 'Commit execution scope and target 28 Nov 2026. Stage 2 opens after stage 1.', history: [h('2026-10-23 09:00', 'noor', 'Submitted')],
      },
      {
        id: 'APR-305', itemType: 'Expense', itemId: 'EXP-5521', itemTitle: 'Vendor workshop travel — Ana', revision: 'rev 1', round: 1, workflowVersion: 'Expense policy v3', status: 'Changes requested', submittedBy: 'ana', submittedAt: '2026-10-19', amount: 640,
        stages: [{ name: 'Finance review', mode: 'Concurrent ALL', decisions: [{ personId: 'noor', decision: 'approved', at: '2026-10-19 16:10' }, { personId: 'nina', decision: 'changes', at: '2026-10-20 09:30', note: 'Hotel receipt missing VAT number. Please attach the itemized invoice.' }] }],
        summary: 'Train + hotel for Ledgerly API workshop. Ana cannot approve her own expense.', history: [],
      },
      {
        id: 'APR-322', itemType: 'Complaint resolution', itemId: 'CMP-0107', itemTitle: 'Restricted complaint case', revision: 'rev 1', round: 1, workflowVersion: 'Complaint committee v2', status: 'Pending', submittedBy: 'elena', submittedAt: '2026-10-24',
        stages: [{ name: 'Committee (conflict-safe)', mode: 'Concurrent ALL', decisions: [{ personId: 'elena', decision: 'pending' }] }],
        summary: 'Resolution sign-off. In-app only — no email notifications.', restricted: true, history: [],
      },
    ],
    proposals: [
      {
        id: 'PRP-24', title: 'Supplier invoice inbox', kind: 'Product', idea: 'Let firms forward supplier invoices to a company inbox and extract them like receipts.', problem: 'Firms re-key supplier invoices manually; clients ask for one capture flow.', solution: 'Dedicated forwarding address per client company, extraction pipeline reuse, review queue.', targetCustomer: 'Accounting firms 5–50 staff', geography: 'EU — Portugal, Spain, Italy', industry: 'Accounting & bookkeeping', benefit: 'Upsell to 30% of Reader clients; ~€3,600 MRR by month 12', steps: 'Discovery → inbox MVP → extraction reuse → beta with 5 firms', skills: '2 developers, 1 ML engineer, support training', dependencies: 'OCR model v2', timeline: 'Q1–Q2 2027', risks: 'Email deliverability; invoice format variety', docs: ['Customer interviews summary.pdf'],
        budgetMode: 'cash', budgetDev: 45000, budgetOngoing: 10000, budgetLow: 50000, budgetHigh: 60000, currency: 'EUR', authorId: 'sam', status: 'Submitted', revision: 3,
        revisions: [{ rev: 1, at: '2026-09-30', by: 'sam', note: 'Draft' }, { rev: 2, at: '2026-10-10', by: 'sam', note: 'Submitted · €40,000' }, { rev: 3, at: '2026-10-21', by: 'sam', note: 'Budget raised to €55,000 after analysis' }],
        analysis: { rev: 3, generatedAt: '2026-10-20 15:00', market: 'Invoice capture is commonly bundled with receipt capture by competitors; EU small firms rely on email forwarding.', competitors: [{ name: 'Capturely', note: 'Inbox forwarding included in mid tier' }, { name: 'PaperLess Pro', note: 'Invoice only; no receipt flow' }], sources: [{ title: 'EU SME accounting survey (synthetic)', date: '2026-06' }, { title: 'Comet Works client interviews', date: '2026-09' }], users: { low: 8, base: 15, high: 24, assumption: 'Share of 48 Reader clients adopting within 12 months' }, adoption: '15 firms in 12 months (base)', pricing: '+€20 per firm per month add-on', steps: 'Inbox MVP (6 wks), extraction reuse (4 wks), beta (6 wks)', staffing: '2 dev, 1 ML, 0.2 support', budget: '€45k build + €10k first-year run', risks: 'Deliverability, supplier format diversity' },
        approverMode: 'board', approverIds: ['maya', 'noor', 'ravi'], approvalId: 'APR-311', updated: '2026-10-21',
      },
      {
        id: 'PRP-27', title: 'Partner referral program', kind: 'Process', idea: 'Referral process for accounting partners.', problem: 'No structured way to reward referrals.', solution: 'Referral form and quarterly payout review.', targetCustomer: 'Accounting partners', geography: 'Portugal', industry: 'Accounting firms', benefit: 'More qualified leads', steps: 'Define policy → pilot with 3 partners', skills: 'Marketing, finance', dependencies: '—', timeline: 'Q1 2027', risks: 'Payout disputes', docs: [],
        budgetMode: 'effort', effort: '~6 person-days', currency: 'EUR', authorId: 'luca', status: 'Draft', revision: 1, revisions: [{ rev: 1, at: '2026-10-24', by: 'luca', note: 'Draft' }], approverMode: 'board', approverIds: ['maya', 'noor', 'ravi'], updated: '2026-10-24',
      },
    ],
    expenses: [
      { id: 'EXP-5510', description: 'Shared cloud hosting — October', payee: 'Nimbus Cloud', category: 'Hosting', amount: 1000, currency: 'EUR', date: '2026-10-12', dept: 'dev', allocations: [{ productId: reader, amount: 600, kind: 'Delivery' }, { productId: ledger, amount: 400, kind: 'Delivery' }], approvalRequired: false, status: 'Paid', payment: { at: '2026-10-14', by: 'nina', method: 'Bank transfer' }, receipt: 'INV-2207.pdf', recurring: 'Monthly', submittedBy: 'nina', source: 'INV-2207 · bank feed match', history: [h('2026-10-12 08:30', 'nina', 'Imported'), h('2026-10-14 10:00', 'nina', 'Payment recorded')] },
      { id: 'EXP-5511', description: 'Shared cloud hosting — October (re-import)', payee: 'Nimbus Cloud', category: 'Hosting', amount: 1000, currency: 'EUR', date: '2026-10-12', dept: 'dev', allocations: [], approvalRequired: false, status: 'Duplicate — held', submittedBy: 'nina', source: 'Duplicate of EXP-5510 (same invoice INV-2207)', history: [h('2026-10-13 08:00', 'nina', 'Held as duplicate of EXP-5510 — excluded from totals')] },
      { id: 'EXP-5530', description: 'OCR labeling contractor — batch 3', payee: 'Labelworks', category: 'Contractor', amount: 2400, currency: 'EUR', date: '2026-10-21', dept: 'dev', projectId: 'PRJ-07', allocations: [{ productId: reader, amount: 2400, kind: 'Delivery' }], approvalRequired: false, status: 'Approved · unpaid', receipt: 'INV-LW-118.pdf', submittedBy: 'noor', source: 'INV-LW-118', history: [h('2026-10-21 16:00', 'nina', 'Approved')] },
      { id: 'EXP-5536', description: 'Support staff allocation — Reader', payee: 'Payroll allocation', category: 'Employee cost', amount: 2600, currency: 'EUR', date: '2026-10-31', dept: 'sup', allocations: [{ productId: reader, amount: 2600, kind: 'Delivery' }], approvalRequired: false, status: 'Approved · unpaid', submittedBy: 'nina', source: 'Payroll allocation PA-10 (60% of support time)', history: [] },
      { id: 'EXP-5534', description: 'Reader launch ads — pre-booking', payee: 'AdReach', category: 'Marketing', amount: 400, currency: 'EUR', date: '2026-10-20', dept: 'mkt', projectId: 'PRJ-07', allocations: [{ productId: reader, amount: 400, kind: 'Operating' }], approvalRequired: false, status: 'Paid', payment: { at: '2026-10-22', by: 'nina', method: 'Card' }, receipt: 'Q-5521.pdf', submittedBy: 'luca', source: 'Quote Q-5521', history: [] },
      { id: 'EXP-5521', description: 'Vendor workshop travel', payee: 'CP Rail / Hotel Aliados', category: 'Travel', amount: 640, currency: 'EUR', date: '2026-10-18', dept: 'dev', projectId: 'PRJ-05', allocations: [{ productId: ledger, amount: 640, kind: 'Delivery' }], approvalRequired: true, approvalId: 'APR-305', status: 'Changes requested', receipt: 'rail.pdf, hotel.jpg', submittedBy: 'ana', source: 'Receipt upload · 2 files', history: [] },
      { id: 'EXP-5540', description: 'Design tool seats', payee: 'Figmaish', category: 'Tools & software', amount: 300, currency: 'EUR', date: '2026-10-03', dept: 'mkt', allocations: [], approvalRequired: false, status: 'Paid', payment: { at: '2026-10-03', by: 'nina', method: 'Card' }, recurring: 'Monthly', submittedBy: 'luca', source: 'Card feed', history: [] },
    ],
    messages: [
      { id: 'MSG-1', ctx: 'project:PRJ-07', authorId: 'luca', at: '2026-10-23 09:12', body: 'Demo for the Ledgerly team is set for 4 Nov. Marta is invited as an external guest (meeting only, no channel access).' },
      { id: 'MSG-2', ctx: 'project:PRJ-07', authorId: 'ana', at: '2026-10-23 09:40', body: 'Connect accounting API submitted with TR-219 evidence. We are ahead of the revised 6 Nov date.' },
      { id: 'MSG-3', ctx: 'project:PRJ-07', authorId: 'noor', at: '2026-10-23 10:05', body: 'We ship handwriting behind a 70% confidence threshold with manual-review fallback. Recorded as a decision.' },
      { id: 'MSG-4', ctx: 'project:PRJ-07', authorId: 'jules', at: '2026-10-23 11:22', body: 'Pricing page is blocked on final scope — waiting on the BLI-88 approval.', parentId: undefined },
      { id: 'MSG-5', ctx: 'project:PRJ-07', authorId: 'luca', at: '2026-10-23 11:30', body: '@Noor can you prioritise stage 1 review so the board can decide this week?', parentId: 'MSG-4' },
      { id: 'MSG-6', ctx: 'department:dev', authorId: 'noor', at: '2026-10-22 08:30', body: 'Reminder: weekly planning moves to Tuesday 10:00 from next week.' },
      { id: 'MSG-7', ctx: 'department:dev', authorId: 'priya', at: '2026-10-22 09:02', body: 'Eval set v2 is uploaded to the department files.' },
      { id: 'MSG-8', ctx: 'product:bps_orion_reader', authorId: 'kofi', at: '2026-10-24 17:10', body: 'Three open Reader tickets mention handwritten totals this week.' },
      { id: 'MSG-9', ctx: 'project:PRJ-05', authorId: 'kofi', at: '2026-10-20 15:00', body: 'Two beta clients asked about conflict resolution timing.' },
    ],
    meetings: [
      { id: 'MTG-12', ctx: 'project:PRJ-07', title: 'Reader v2 vendor demo', agenda: 'Demo handwriting + export to Ledgerly', date: '2026-11-04', time: '14:00', tz: 'Europe/Lisbon', duration: 45, attendeeIds: ['luca', 'ana', 'noor'], external: ['marta@ledgerly.example'], url: 'https://meet.example.com/abc-defg-hij', organizerId: 'luca', status: 'Scheduled', history: [h('2026-10-22 10:00', 'luca', 'Scheduled · invitations simulated')] },
      { id: 'MTG-13', ctx: 'department:dev', title: 'Development weekly planning', agenda: 'Sprint priorities, blockers', date: '2026-10-28', time: '10:00', tz: 'Europe/Lisbon', duration: 30, attendeeIds: ['noor', 'ana', 'priya', 'omar'], external: [], url: 'https://meet.example.com/dev-weekly', organizerId: 'noor', status: 'Scheduled', history: [] },
    ],
    files: [
      { id: 'FILE-41', ctx: 'project:PRJ-07', name: 'Reader v2 release plan.pdf', kind: 'PDF', size: '1.2 MB', versions: [{ v: 1, at: '2026-10-01', by: 'luca', note: 'Initial' }, { v: 2, at: '2026-10-15', by: 'luca', note: 'Scope update' }, { v: 3, at: '2026-10-22', by: 'luca', note: 'Dates revised' }], source: 'Upload' },
      { id: 'FILE-38', ctx: 'project:PRJ-07', name: 'Handwriting eval report EVR-12.pdf', kind: 'PDF', size: '3.4 MB', versions: [{ v: 1, at: '2026-10-18', by: 'priya', note: 'Initial' }], source: 'Upload' },
      { id: 'FILE-31', ctx: 'project:PRJ-05', name: 'API rate limits.md', kind: 'Markdown', size: '18 KB', versions: [{ v: 2, at: '2026-09-21', by: 'ana', note: 'Accepted version' }], source: 'Upload' },
      { id: 'FILE-50', ctx: 'department:dev', name: 'Handwriting eval set v2.csv', kind: 'CSV', size: '640 KB', versions: [{ v: 1, at: '2026-10-22', by: 'priya', note: 'Initial' }], source: 'Upload' },
    ],
    decisions: [
      { id: 'DEC-14', ctx: 'project:PRJ-07', title: 'Ship handwriting behind 70% confidence threshold', text: 'Handwritten fields below 70% confidence go to manual review.', rationale: 'Keeps accuracy above 90% for auto-filled fields.', deciderId: 'noor', at: '2026-10-23 10:05', related: 'Message MSG-3', createdBy: 'noor' },
      { id: 'DEC-11', ctx: 'project:PRJ-07', title: 'Use Ledgerly API v3 for accounting connector', text: 'Build the connector on API v3 only.', rationale: 'v2 is deprecated in 2027.', deciderId: 'noor', at: '2026-10-09 11:00', related: 'Meeting notes', createdBy: 'luca' },
    ],
    announcements: [
      { id: 'ANN-33', title: 'Open enrollment for 2027 benefits', body: 'Open enrollment runs until 15 November. Review the plan summary and choose your options in the benefits portal.', audience: { type: 'all', deptIds: [] }, attachments: ['2027_benefits_summary.pdf'], senderId: 'elena', ackRequired: true, status: 'Published', publishedAt: '2026-10-20 09:00', email: true, acks: ['maya', 'ravi', 'noor', 'luca', 'kofi', 'elena', 'ines', 'nina', 'priya', 'omar', 'jules'], history: [h('2026-10-20 09:00', 'elena', 'Published to all employees · in-app + email (simulated)')] },
      { id: 'ANN-34', title: 'Reader v2 launch readiness', body: 'Launch readiness review on 3 Nov. Teams: bring open blockers.', audience: { type: 'depts', deptIds: ['dev', 'mkt', 'sup'] }, attachments: [], senderId: 'luca', ackRequired: false, status: 'Scheduled', scheduledAt: '2026-11-03 09:00', email: false, acks: [], history: [h('2026-10-24 12:00', 'luca', 'Scheduled for 3 Nov 09:00')] },
    ],
    complaints: [
      { id: 'CMP-0107', submitterId: 'sam', category: 'Workplace conduct', summary: 'Concern about meeting conduct', details: 'Details visible to the assigned committee only.', status: 'Under review', receivedAt: '2026-10-18 14:00', notes: [{ at: '2026-10-19 10:00', by: 'elena', text: 'Interview scheduled with both parties.' }] },
    ],
    committees: [
      { id: 'COM-BOARD', name: 'Board of Directors', memberIds: ['maya', 'ravi', 'noor'], mode: 'Concurrent ALL', version: 4, appliesTo: 'Proposals', history: [h('2026-10-18 10:30', 'maya', 'Version 4 published — applies to new rounds only')] },
      { id: 'COM-CMP', name: 'Complaint committee', memberIds: ['elena'], mode: 'Concurrent ALL', version: 2, appliesTo: 'Complaint resolutions (in-app only)', history: [] },
    ],
    workflows: [
      { id: 'WF-PRP', name: 'Proposal approval', appliesTo: 'Proposal', stages: [{ name: 'Board of Directors', mode: 'Concurrent ALL', approverIds: ['maya', 'ravi', 'noor'], committeeId: 'COM-BOARD' }], version: 4, history: [] },
      { id: 'WF-REL', name: 'Release workflow', appliesTo: 'Backlog item', stages: [{ name: 'Technical review', mode: 'Ordered stage', approverIds: ['noor'] }, { name: 'Release board', mode: 'Ordered stage', approverIds: ['maya', 'ravi', 'luca'] }], version: 2, history: [] },
      { id: 'WF-EXP', name: 'Expense policy', appliesTo: 'Expense', stages: [{ name: 'Finance review', mode: 'Concurrent ALL', approverIds: ['nina'] }], version: 3, history: [] },
    ],
    mailboxes,
    audit: [
      { id: 'AUD-9921', at: '2026-10-24 18:02', actor: 'maya', action: 'Role permission changed', target: 'Ravi Menon → finance reports', detail: 'Reason: board reporting' },
      { id: 'AUD-9910', at: '2026-10-23 09:01', actor: 'maya', action: 'Mailbox access attempt denied', target: 'Private mailbox (owner-only)', detail: 'No content returned · no override exists' },
      { id: 'AUD-9902', at: '2026-10-18 17:44', actor: 'elena', action: 'Employee deactivated', target: 'Tom Andersen', detail: 'Pending approvals flagged for replacement' },
    ],
    productivityRequests: [],
  })
}

export function freshCompany(id: string, name: string, owner: { id: string; fullName: string; email: string; designation: string }, packageId: string, industry: string, country: string): CompanyData {
  const pkg = packages.find((p) => p.id === packageId) ?? packages[2]
  return {
    id,
    name,
    industry,
    country,
    packageId,
    onboarding: { done: false, step: 0, skipped: [] },
    credits: { limit: pkg.aiCredits, used: 0, ops: [] },
    seq: 1,
    departments: [{ id: 'exec', name: 'Leadership', leadId: owner.id, color: 'exec', isDepartment: false }],
    employees: [{ id: owner.id, fullName: owner.fullName, designation: owner.designation, dept: 'exec', email: owner.email, status: 'active', location: '—', joined: TODAY, accessRole: 'owner', financeRead: true }],
    relationships: [],
    layout: {},
    responsibilities: [],
    invitations: [],
    activities: [],
    projects: [],
    products: [],
    revenue: [],
    backlog: [],
    releases: [],
    approvals: [],
    proposals: [],
    expenses: [],
    messages: [],
    meetings: [],
    files: [],
    decisions: [],
    announcements: [],
    complaints: [],
    committees: [{ id: 'COM-BOARD', name: 'Board of Directors', memberIds: [owner.id], mode: 'Concurrent ALL', version: 1, appliesTo: 'Proposals', history: [] }],
    workflows: [{ id: 'WF-PRP', name: 'Proposal approval', appliesTo: 'Proposal', stages: [{ name: 'Board of Directors', mode: 'Concurrent ALL', approverIds: [owner.id], committeeId: 'COM-BOARD' }], version: 1, history: [] }],
    mailboxes: {
      [owner.id]: [
        { id: `${owner.id}_m1`, folder: 'Inbox', from: 'Operations Hub <hello@opshub.example>', to: owner.email, subject: 'Welcome to Company Operations Hub', body: `Hi ${owner.fullName.split(' ')[0]}, your company workspace is ready. This is a sample message in your private, read-only mailbox.`, date: `${TODAY} 09:00` },
        { id: `${owner.id}_m2`, folder: 'Sent', from: owner.email, to: 'Operations Hub <hello@opshub.example>', subject: 'Re: Welcome', body: 'Thanks — setting up our structure now.', date: `${TODAY} 09:20` },
      ],
    },
    audit: [],
    productivityRequests: [],
  }
}
