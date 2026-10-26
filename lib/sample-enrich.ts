import type { Activity, CompanyData, DecisionRecord, FileRecord, Meeting, Message, Project, Responsibility } from './fixtures'

/**
 * Fills the sample company so every active employee has one-line responsibilities,
 * activities across every status, and at least one project with a live conversation.
 */

const h = (at: string, by: string, text: string) => ({ at, by, text })

const RESPONSIBILITIES: Record<string, { by: string; since: string; items: string[] }> = {
  maya: { by: 'maya', since: '2019-02-01', items: ['Set company strategy and annual priorities with the board', 'Chair the Board of Directors and approve major proposals', 'Approve capital allocation and budgets above €25k', 'Represent the company with investors and key partners'] },
  ravi: { by: 'maya', since: '2019-06-12', items: ['Own the quarterly operating plan', 'Lead the executive team weekly review', 'Approve executive and senior hires', 'Review department budgets every month'] },
  noor: { by: 'ravi', since: '2020-01-20', items: ['Lead engineering delivery for Reader and Ledger Sync', 'Run technical review on every release', 'Own platform reliability and incident response', 'Grow and mentor the Development team'] },
  ana: { by: 'noor', since: '2022-09-05', items: ['Build and maintain accounting integrations', 'Review integration pull requests within two working days', 'Keep the API documentation up to date', 'Support beta clients on integration issues'] },
  priya: { by: 'noor', since: '2023-03-14', items: ['Train and evaluate the OCR extraction models', 'Maintain the evaluation datasets', 'Monitor model accuracy in production every week'] },
  omar: { by: 'noor', since: '2024-01-08', items: ['Write and run release test plans', 'Triage and verify reported bugs', 'Maintain the automated regression suite'] },
  luca: { by: 'ravi', since: '2021-05-17', items: ['Own product positioning and pricing', 'Plan and run product launches', 'Manage the marketing budget', 'Report monthly on pipeline and campaign results'] },
  jules: { by: 'luca', since: '2023-07-03', items: ['Write website, launch and help-centre content', 'Publish two blog posts every month', 'Keep brand voice consistent across channels'] },
  kofi: { by: 'ravi', since: '2021-11-01', items: ['Lead customer support and hit response-time targets', 'Run the Guided Onboarding service', 'Feed support insights back to Product every week', 'Coach and schedule the support team'] },
  sam: { by: 'kofi', since: '2023-02-20', items: ['Answer Tier 1 and Tier 2 support tickets', 'Maintain support macros and saved replies', 'Prepare the weekly escalation report'] },
  lin: { by: 'kofi', since: '2024-04-15', items: ['Answer Tier 1 support tickets in the APAC shift', 'Run onboarding calls for new clients', 'Keep help-centre articles accurate'] },
  elena: { by: 'ravi', since: '2020-08-10', items: ['Run people operations and HR policy', 'Publish company announcements', 'Own hiring process and onboarding', 'Handle workplace complaints confidentially'] },
  ines: { by: 'elena', since: '2024-06-01', items: ['Coordinate interviews and candidate communication', 'Prepare onboarding for every new joiner', 'Maintain employee records'] },
  nina: { by: 'ravi', since: '2020-03-02', items: ['Approve expenses and record payments', 'Reconcile revenue feeds every month', 'Close the books by working day 5', 'Prepare finance reports for the board'] },
}

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

const reader = 'bps_orion_reader'
const ledger = 'bps_ledger_sync'

const EXTRA_ACTIVITIES: Activity[] = [
  // Leadership — Maya owns, reviews, and has overdue work.
  act({ id: 'ACT-2001', title: 'Sign off Q4 investor update', outcome: 'Investor update sent with product-level client counts', ownerId: 'maya', reviewerId: 'ravi', dept: 'exec', projectId: 'PRJ-10', status: 'In progress', priority: 'High', originalDue: '2026-10-22', history: [h('2026-10-15 09:00', 'maya', 'Activity created')] }),
  act({ id: 'ACT-2002', title: 'Approve FY27 budget envelope', outcome: 'Top-line budget agreed per department', ownerId: 'maya', reviewerId: 'ravi', dept: 'exec', projectId: 'PRJ-10', status: 'Planned', priority: 'High', originalDue: '2026-11-20' }),
  act({ id: 'ACT-2003', title: 'Q4 operating plan review', outcome: 'Operating plan with owners for each goal', ownerId: 'ravi', reviewerId: 'maya', dept: 'exec', projectId: 'PRJ-10', status: 'Submitted for review', priority: 'High', originalDue: '2026-10-26', evidence: 'Operating plan v3 (Q4-OP.pdf)', history: [h('2026-10-24 17:20', 'ravi', 'Submitted for review')] }),
  act({ id: 'ACT-2004', title: 'Executive hiring scorecard', outcome: 'Scorecard for VP Sales search', ownerId: 'ravi', reviewerId: 'maya', dept: 'exec', projectId: 'PRJ-08', status: 'In progress', originalDue: '2026-10-20' }),
  act({ id: 'ACT-2005', title: 'October management accounts', outcome: 'P&L and cash position for October', ownerId: 'nina', reviewerId: 'maya', dept: 'fin', projectId: 'PRJ-10', status: 'Submitted for review', priority: 'High', originalDue: '2026-10-24', evidence: 'MA-OCT.xlsx uploaded', history: [h('2026-10-24 12:00', 'nina', 'Submitted for review')] }),
  act({ id: 'ACT-2006', title: 'Department budget templates', outcome: 'Budget template sent to all department leads', ownerId: 'nina', reviewerId: 'ravi', dept: 'fin', projectId: 'PRJ-10', status: 'Accepted', originalDue: '2026-10-14', acceptedAt: '2026-10-13', evidence: 'Template FY27-BUD v1' }),
  act({ id: 'ACT-2007', title: 'Brand refresh direction', outcome: 'Approved visual direction for website', ownerId: 'luca', reviewerId: 'maya', dept: 'mkt', projectId: 'PRJ-09', status: 'Submitted for review', originalDue: '2026-10-27', evidence: 'Moodboard MB-3 and type specimen' }),
  // Development
  act({ id: 'ACT-2010', title: 'Incident review: export outage 12 Oct', outcome: 'Post-mortem with 3 follow-up actions', ownerId: 'noor', reviewerId: 'ravi', dept: 'dev', status: 'Accepted', originalDue: '2026-10-16', acceptedAt: '2026-10-16', evidence: 'PM-12 document' }),
  act({ id: 'ACT-2011', title: 'Conflict resolution UI for Ledger Sync', outcome: 'Users can resolve sync conflicts in-app', ownerId: 'noor', reviewerId: 'ravi', dept: 'dev', projectId: 'PRJ-05', productId: ledger, status: 'In progress', priority: 'High', originalDue: '2026-11-18' }),
  act({ id: 'ACT-2012', title: 'Batch upload performance tuning', outcome: '200 receipts processed under 60 seconds', ownerId: 'priya', reviewerId: 'noor', dept: 'dev', projectId: 'PRJ-07', productId: reader, status: 'In progress', originalDue: '2026-11-08' }),
  act({ id: 'ACT-2013', title: 'Production accuracy dashboard', outcome: 'Weekly accuracy chart per field type', ownerId: 'priya', reviewerId: 'noor', dept: 'dev', productId: reader, status: 'Blocked', originalDue: '2026-10-21', blocker: 'Waiting on analytics workspace access' }),
  act({ id: 'ACT-2014', title: 'Regression suite for Ledger Sync', outcome: '40 automated sync scenarios', ownerId: 'omar', reviewerId: 'noor', dept: 'dev', projectId: 'PRJ-05', productId: ledger, status: 'Submitted for review', originalDue: '2026-10-25', evidence: 'CI run #1182 · 40/40 passing' }),
  act({ id: 'ACT-2015', title: 'Verify webhook duplicate fix (QA-77)', outcome: 'QA-77 verified closed', ownerId: 'omar', reviewerId: 'noor', dept: 'dev', projectId: 'PRJ-05', productId: ledger, status: 'Planned', originalDue: '2026-11-03', dependsOn: 'ACT-1019' }),
  // Marketing
  act({ id: 'ACT-2020', title: 'Reader v2 launch plan', outcome: 'Channel plan with dates and owners', ownerId: 'luca', reviewerId: 'ravi', dept: 'mkt', projectId: 'PRJ-07', productId: reader, status: 'Accepted', originalDue: '2026-10-10', acceptedAt: '2026-10-09' }),
  act({ id: 'ACT-2021', title: 'New homepage copy', outcome: 'Homepage copy approved by Luca', ownerId: 'jules', reviewerId: 'luca', dept: 'mkt', projectId: 'PRJ-09', status: 'In progress', originalDue: '2026-11-07' }),
  act({ id: 'ACT-2022', title: 'October blog posts', outcome: 'Two posts published', ownerId: 'jules', reviewerId: 'luca', dept: 'mkt', status: 'Accepted', originalDue: '2026-10-20', acceptedAt: '2026-10-21' }),
  // Support
  act({ id: 'ACT-2030', title: 'Support staffing plan for launch week', outcome: 'Rota covering 08:00–20:00 for launch week', ownerId: 'kofi', reviewerId: 'ravi', dept: 'sup', projectId: 'PRJ-07', status: 'In progress', originalDue: '2026-11-12' }),
  act({ id: 'ACT-2031', title: 'Beta client check-ins', outcome: 'Call notes for all 20 beta clients', ownerId: 'kofi', reviewerId: 'noor', dept: 'sup', projectId: 'PRJ-05', productId: ledger, status: 'In progress', originalDue: '2026-10-23' }),
  act({ id: 'ACT-2032', title: 'Help-centre articles for batch upload', outcome: '3 new help articles', ownerId: 'lin', reviewerId: 'kofi', dept: 'sup', projectId: 'PRJ-07', productId: reader, status: 'Planned', originalDue: '2026-11-15' }),
  act({ id: 'ACT-2033', title: 'APAC onboarding calls', outcome: '5 onboarding calls completed', ownerId: 'lin', reviewerId: 'kofi', dept: 'sup', projectId: 'PRJ-08', status: 'Submitted for review', originalDue: '2026-10-24', evidence: 'Call log CL-44' }),
  act({ id: 'ACT-2034', title: 'Ticket tagging clean-up', outcome: 'All open tickets tagged by product', ownerId: 'sam', reviewerId: 'kofi', dept: 'sup', status: 'Accepted', originalDue: '2026-10-11', acceptedAt: '2026-10-11' }),
  // HR
  act({ id: 'ACT-2040', title: 'Backend engineer hiring loop', outcome: 'Offer accepted for Senior Backend Engineer', ownerId: 'elena', reviewerId: 'ravi', dept: 'hr', projectId: 'PRJ-08', status: 'In progress', priority: 'High', originalDue: '2026-11-10' }),
  act({ id: 'ACT-2041', title: 'Onboarding checklist v2', outcome: 'Checklist covering first 30 days', ownerId: 'elena', reviewerId: 'ravi', dept: 'hr', projectId: 'PRJ-08', status: 'Accepted', originalDue: '2026-10-12', acceptedAt: '2026-10-12' }),
  act({ id: 'ACT-2042', title: 'Schedule panel interviews', outcome: '6 panel interviews booked', ownerId: 'ines', reviewerId: 'elena', dept: 'hr', projectId: 'PRJ-08', status: 'In progress', originalDue: '2026-10-22' }),
  act({ id: 'ACT-2043', title: 'Prepare Diego’s first-week plan', outcome: 'First-week schedule and equipment ready', ownerId: 'ines', reviewerId: 'elena', dept: 'hr', projectId: 'PRJ-08', status: 'Planned', originalDue: '2026-11-13' }),
]

const EXTRA_PROJECTS: Project[] = [
  {
    id: 'PRJ-08', name: 'Q4 hiring & onboarding', purpose: 'Hire the Senior Backend Engineer and VP Sales, and onboard every new joiner within 30 days.', pmId: 'elena', sponsorId: 'ravi', status: 'Active',
    members: [{ personId: 'elena', role: 'Project manager' }, { personId: 'ines', role: 'Recruiting coordinator' }, { personId: 'ravi', role: 'Hiring manager (exec)' }, { personId: 'noor', role: 'Hiring manager (engineering)' }, { personId: 'lin', role: 'Onboarding buddy' }],
    formerMembers: [], productIds: [], ownerDept: 'hr', deptIds: ['hr', 'exec', 'dev', 'sup'], start: '2026-10-01', target: '2026-12-15', deliverables: ['Two offers accepted', 'Onboarding checklist v2', 'First-week plans'],
    stages: [
      { name: 'Define roles', ownerId: 'elena', needs: 'Scorecards approved', approverIds: ['ravi'], status: 'Done' },
      { name: 'Interviewing', ownerId: 'ines', needs: 'Final candidates shortlisted', approverIds: ['elena'], status: 'Current' },
      { name: 'Offers', ownerId: 'elena', needs: 'Offers signed', approverIds: ['ravi'], status: 'Upcoming' },
      { name: 'Onboarding', ownerId: 'ines', needs: 'First 30 days completed', approverIds: ['elena'], status: 'Upcoming' },
    ],
    history: [h('2026-10-01 09:00', 'elena', 'Project created'), h('2026-10-12 16:00', 'elena', 'Stage "Define roles" marked done')],
  },
  {
    id: 'PRJ-09', name: 'Brand refresh & website', purpose: 'Refresh the visual identity and relaunch cometworks.example before the Reader v2 launch.', pmId: 'luca', sponsorId: 'maya', status: 'Planning',
    members: [{ personId: 'luca', role: 'Project manager' }, { personId: 'jules', role: 'Copywriter' }, { personId: 'maya', role: 'Executive sponsor' }],
    formerMembers: [], productIds: [], ownerDept: 'mkt', deptIds: ['mkt', 'exec'], start: '2026-10-10', target: '2026-11-25', deliverables: ['Visual direction', 'Homepage', 'Pricing page'], budget: 12000,
    stages: [
      { name: 'Direction', ownerId: 'luca', needs: 'Visual direction approved', approverIds: ['maya'], status: 'Current' },
      { name: 'Build', ownerId: 'jules', needs: 'All pages written and designed', approverIds: ['luca'], status: 'Upcoming' },
      { name: 'Go live', ownerId: 'luca', needs: 'Site published', approverIds: ['maya'], status: 'Upcoming' },
    ],
    history: [h('2026-10-10 10:00', 'luca', 'Project created')],
  },
  {
    id: 'PRJ-10', name: 'FY27 budget & board reporting', purpose: 'Agree the FY27 budget with every department and deliver the November board pack.', pmId: 'nina', sponsorId: 'maya', status: 'Active',
    members: [{ personId: 'nina', role: 'Project manager' }, { personId: 'maya', role: 'Board chair' }, { personId: 'ravi', role: 'CEO' }],
    formerMembers: [{ personId: 'tom', role: 'Accountant', until: '2026-10-18' }], productIds: [], ownerDept: 'fin', deptIds: ['fin', 'exec'], start: '2026-10-01', target: '2026-11-30', deliverables: ['Department budgets', 'Board pack', 'FY27 budget approved'],
    stages: [
      { name: 'Templates', ownerId: 'nina', needs: 'Templates sent to department leads', approverIds: [], status: 'Done' },
      { name: 'Department drafts', ownerId: 'nina', needs: 'All drafts received', approverIds: ['ravi'], status: 'Current' },
      { name: 'Board approval', ownerId: 'maya', needs: 'Board approves FY27 budget', approverIds: ['maya', 'ravi', 'noor'], status: 'Upcoming' },
    ],
    history: [h('2026-10-01 08:30', 'nina', 'Project created'), h('2026-10-14 10:00', 'nina', 'Stage "Templates" marked done')],
  },
]

const EXTRA_MESSAGES: Message[] = [
  { id: 'MSG-20', ctx: 'project:PRJ-07', authorId: 'noor', at: '2026-10-23 11:48', body: 'On it — I will review stage 1 tomorrow morning.', parentId: 'MSG-4' },
  { id: 'MSG-21', ctx: 'project:PRJ-07', authorId: 'priya', at: '2026-10-24 09:15', body: 'Batch upload is at 74 seconds for 200 receipts. Should hit the 60s target by Friday.' },
  { id: 'MSG-22', ctx: 'project:PRJ-07', authorId: 'kofi', at: '2026-10-24 10:02', body: 'Support rota for launch week is drafted — please flag any holidays.' },
  { id: 'MSG-23', ctx: 'project:PRJ-07', authorId: 'sam', at: '2026-10-24 10:20', body: 'I am off 26 Nov, otherwise available.', parentId: 'MSG-22' },
  { id: 'MSG-24', ctx: 'project:PRJ-05', authorId: 'noor', at: '2026-10-20 15:30', body: 'Conflict resolution UI is targeted for 18 Nov. I will share a preview next week.', parentId: 'MSG-9' },
  { id: 'MSG-25', ctx: 'project:PRJ-05', authorId: 'omar', at: '2026-10-24 16:40', body: 'Regression suite is green — 40/40. Submitted for review.' },
  { id: 'MSG-30', ctx: 'project:PRJ-08', authorId: 'elena', at: '2026-10-21 09:00', body: 'We have 4 backend candidates in final round. Panels need one engineer each.' },
  { id: 'MSG-31', ctx: 'project:PRJ-08', authorId: 'noor', at: '2026-10-21 09:20', body: 'Ana and Omar can cover two panels each.', parentId: 'MSG-30' },
  { id: 'MSG-32', ctx: 'project:PRJ-08', authorId: 'ines', at: '2026-10-22 14:10', body: 'Panels booked for 28–30 Oct. Calendar invites sent.' },
  { id: 'MSG-33', ctx: 'project:PRJ-09', authorId: 'luca', at: '2026-10-22 11:00', body: 'Moodboard MB-3 is up for review. Two directions: "ledger paper" and "studio".' },
  { id: 'MSG-34', ctx: 'project:PRJ-09', authorId: 'maya', at: '2026-10-22 13:30', body: 'Leaning towards "ledger paper" — feels closer to our customers.', parentId: 'MSG-33' },
  { id: 'MSG-35', ctx: 'project:PRJ-09', authorId: 'jules', at: '2026-10-23 10:00', body: 'Homepage copy draft 1 is in the files tab.' },
  { id: 'MSG-40', ctx: 'project:PRJ-10', authorId: 'nina', at: '2026-10-20 08:45', body: 'Department drafts are due 31 Oct. Development and Support are already in.' },
  { id: 'MSG-41', ctx: 'project:PRJ-10', authorId: 'ravi', at: '2026-10-20 09:10', body: 'Marketing will be late — Luca is on the brand refresh. I will chase.', parentId: 'MSG-40' },
  { id: 'MSG-42', ctx: 'project:PRJ-10', authorId: 'maya', at: '2026-10-24 18:00', body: 'Board pack should lead with client growth by product, then cash runway.' },
]

const EXTRA_DECISIONS: DecisionRecord[] = [
  { id: 'DEC-20', ctx: 'project:PRJ-08', title: 'Hire one senior backend engineer, not two juniors', text: 'Open a single Senior Backend Engineer role for Q4.', rationale: 'Ledger Sync needs experienced ownership before GA.', deciderId: 'ravi', at: '2026-10-05', related: '', createdBy: 'elena' },
  { id: 'DEC-21', ctx: 'project:PRJ-10', title: 'Budget envelopes set top-down first', text: 'Departments draft within an envelope set by the CEO.', rationale: 'Faster convergence than bottom-up drafts.', deciderId: 'maya', at: '2026-10-08', related: '', createdBy: 'nina' },
  { id: 'DEC-22', ctx: 'project:PRJ-09', title: 'Website stays on current domain', text: 'No domain change during the refresh.', rationale: 'Protects SEO ahead of the Reader v2 launch.', deciderId: 'luca', at: '2026-10-14', related: '', createdBy: 'luca' },
]

const EXTRA_FILES: FileRecord[] = [
  { id: 'FILE-60', ctx: 'project:PRJ-08', name: 'Senior Backend Engineer scorecard.pdf', kind: 'PDF', size: '220 KB', versions: [{ v: 1, at: '2026-10-03', by: 'elena', note: 'Initial' }], source: 'Upload' },
  { id: 'FILE-61', ctx: 'project:PRJ-09', name: 'Moodboard MB-3.fig', kind: 'Figma', size: 'Link', versions: [{ v: 3, at: '2026-10-22', by: 'luca', note: 'Two directions' }], source: 'Link', url: 'https://figma.example/mb-3' },
  { id: 'FILE-62', ctx: 'project:PRJ-09', name: 'Homepage copy draft 1.docx', kind: 'Word', size: '48 KB', versions: [{ v: 1, at: '2026-10-23', by: 'jules', note: 'Initial' }], source: 'Upload' },
  { id: 'FILE-63', ctx: 'project:PRJ-10', name: 'FY27 budget template.xlsx', kind: 'Excel', size: '96 KB', versions: [{ v: 1, at: '2026-10-13', by: 'nina', note: 'Initial' }], source: 'Upload' },
]

const EXTRA_MEETINGS: Meeting[] = [
  { id: 'MTG-20', ctx: 'project:PRJ-08', title: 'Backend final panels', agenda: 'Final-round interviews, 4 candidates', date: '2026-10-28', time: '10:00', tz: 'Europe/Lisbon', duration: 60, attendeeIds: ['elena', 'noor', 'ana', 'omar'], external: [], url: 'https://meet.example/hire-be', organizerId: 'ines', status: 'Scheduled', history: [] },
  { id: 'MTG-21', ctx: 'project:PRJ-09', title: 'Brand direction review', agenda: 'Choose between ledger paper and studio', date: '2026-10-29', time: '15:00', tz: 'Europe/Lisbon', duration: 45, attendeeIds: ['luca', 'jules', 'maya'], external: [], url: 'https://meet.example/brand', organizerId: 'luca', status: 'Scheduled', history: [] },
  { id: 'MTG-22', ctx: 'project:PRJ-10', title: 'Board pack dry run', agenda: 'Walk through the November board pack', date: '2026-11-03', time: '09:30', tz: 'Europe/Lisbon', duration: 60, attendeeIds: ['nina', 'maya', 'ravi'], external: [], url: 'https://meet.example/board', organizerId: 'nina', status: 'Scheduled', history: [] },
]

const SALARIES: Record<string, number> = {
  maya: 140000, ravi: 130000, noor: 110000, ana: 58000, priya: 64000, omar: 46000, luca: 72000,
  jules: 48000, kofi: 62000, sam: 36000, lin: 34000, elena: 70000, ines: 40000, nina: 76000, tom: 44000,
}

export function enrichSample(c: CompanyData): CompanyData {
  c.employees.forEach((e) => {
    if (SALARIES[e.id]) e.salary = SALARIES[e.id]
  })
  const responsibilities: Responsibility[] = []
  Object.entries(RESPONSIBILITIES).forEach(([employeeId, r]) =>
    r.items.forEach((text, i) =>
      responsibilities.push({
        id: `RSP-${employeeId}-${i + 1}`,
        employeeId,
        title: text,
        description: text,
        scope: '',
        assignerId: r.by,
        effective: r.since,
        approvalRequired: false,
        status: 'Active',
        versions: [{ v: 1, text, at: `${r.since} 09:00`, by: r.by, note: 'Assigned' }],
      }),
    ),
  )
  c.responsibilities = responsibilities
  c.activities = [...c.activities, ...EXTRA_ACTIVITIES]
  c.projects = [...c.projects, ...EXTRA_PROJECTS]
  c.messages = [...c.messages, ...EXTRA_MESSAGES]
  c.decisions = [...c.decisions, ...EXTRA_DECISIONS]
  c.files = [...c.files, ...EXTRA_FILES]
  c.meetings = [...c.meetings, ...EXTRA_MEETINGS]
  return c
}
