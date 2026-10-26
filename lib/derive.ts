import { PERIOD, TODAY, ctxKey, defaultConnectors, tickets as seedTickets, type Activity, type ApprovalRound, type BusinessProduct, type CompanyData, type ContextRef, type Department, type Employee, type Expense, type Project, type SourceKind, type SourceLink, type SupportTicket } from './fixtures'
import { capsFor } from './store'

export const connectorsOf = (c: CompanyData) => c.connectors ?? defaultConnectors
export const isInternal = (b: BusinessProduct) => b.revenueModel === 'Internal'

const fallbackSource: Record<string, Partial<Record<SourceKind, SourceLink>>> = {
  bps_orion_reader: { clients: { mode: 'MCP', connectorId: 'mcp_zoho_crm', mapping: 'Deals · Product = Reader · Stage = Closed won', lastSync: '2026-10-25 06:00' }, tickets: { mode: 'MCP', connectorId: 'mcp_zoho_desk', mapping: 'Department: Reader', lastSync: '2026-10-24 17:05' }, revenue: { mode: 'MCP', connectorId: 'mcp_zoho_books', mapping: 'Item group READER', lastSync: '2026-10-25 06:00' } },
  bps_ledger_sync: { clients: { mode: 'Manual' }, tickets: { mode: 'MCP', connectorId: 'mcp_zoho_desk', mapping: 'Tag: ledger-sync', lastSync: '2026-10-24 11:45' } },
}

export function sourceOf(c: CompanyData, b: BusinessProduct, kind: SourceKind): { link: SourceLink; connector?: ReturnType<typeof connectorsOf>[number]; label: string } {
  const link = b.sources?.[kind] ?? fallbackSource[b.id]?.[kind] ?? { mode: 'Manual' as const }
  const connector = link.connectorId ? connectorsOf(c).find((x) => x.id === link.connectorId) : undefined
  const label = link.mode === 'MCP' ? `${connector?.name ?? 'MCP'} via MCP` : link.mode === 'Excel upload' ? 'Excel upload' : 'Entered manually'
  return { link, connector, label }
}

export const ticketsOf = (c: CompanyData, productId: string): SupportTicket[] => [...(c.supportTickets ?? []), ...seedTickets].filter((t) => t.product === productId)

export const scopeOf = (a: Activity): 'department' | 'project' | 'product' => a.scope ?? (a.projectId ? 'project' : a.productId ? 'product' : 'department')

/** Everything planned or running against a product, gathered across departments and projects. */
export function productInsight(c: CompanyData, productId: string) {
  const b = c.products.find((p) => p.id === productId)
  const projects = c.projects.filter((p) => p.productIds.includes(productId))
  const projectIds = new Set(projects.map((p) => p.id))
  const backlog = c.backlog.filter((x) => x.productId === productId)
  const backlogIds = new Set(backlog.map((x) => x.id))
  const activities = c.activities.filter((a) => a.productId === productId || (a.projectId && projectIds.has(a.projectId)) || (a.backlogId && backlogIds.has(a.backlogId)))
  const releases = c.releases.filter((r) => r.productId === productId)
  const roles = new Map<string, Set<string>>()
  const add = (id: string | undefined, role: string) => {
    if (!id || !c.employees.some((e) => e.id === id && e.status !== 'vacancy')) return
    if (!roles.has(id)) roles.set(id, new Set())
    roles.get(id)!.add(role)
  }
  if (b) add(b.ownerId, 'Product owner')
  projects.forEach((p) => {
    add(p.pmId, `PM · ${p.name}`)
    p.members.forEach((m) => add(m.personId, `${m.role} · ${p.name}`))
  })
  activities.forEach((a) => {
    add(a.ownerId, 'Activity owner')
    add(a.reviewerId, 'Reviewer')
  })
  backlog.forEach((x) => add(x.ownerId, 'Backlog owner'))
  releases.forEach((r) => add(r.ownerId, 'Release owner'))
  const people = Array.from(roles.entries()).map(([personId, r]) => ({ personId, roles: Array.from(r) }))
  const depts = Array.from(new Set([...(b ? [b.dept] : []), ...projects.flatMap((p) => p.deptIds), ...activities.map((a) => a.dept)]))
  const openActivities = activities.filter(isOpen)
  const tix = ticketsOf(c, productId)
  return {
    projects,
    activeProjects: projects.filter((p) => !['Completed', 'Cancelled', 'Closed'].includes(p.status)),
    activities,
    openActivities,
    overdue: openActivities.filter(isOverdue),
    backlog,
    queued: backlog.filter((x) => x.status === 'Submitted for approval' || x.status === 'Committed' || x.status === 'Draft'),
    releases,
    people,
    depts,
    tickets: tix,
    openTickets: tix.filter((t) => t.status !== 'Solved' && t.status !== 'Closed'),
  }
}

export const empOf = (c: CompanyData, id?: string | null) => (id ? c.employees.find((e) => e.id === id) : undefined)
export const deptOf = (c: CompanyData, id?: string | null) => (id ? c.departments.find((d) => d.id === id) : undefined)
export const productOf = (c: CompanyData, id?: string | null) => (id ? c.products.find((p) => p.id === id) : undefined)
export const projectOf = (c: CompanyData, id?: string | null) => (id ? c.projects.find((p) => p.id === id) : undefined)
export const firstName = (e?: Employee) => e?.fullName.split(' ')[0] ?? 'Unknown'

export const managerOf = (c: CompanyData, id: string) => c.relationships.find((r) => r.from === id && r.type === 'direct')?.to
export const directReports = (c: CompanyData, id: string) => c.relationships.filter((r) => r.to === id && r.type === 'direct').map((r) => r.from).filter((x) => empOf(c, x)?.status !== 'vacancy')
export const activeEmployees = (c: CompanyData) => c.employees.filter((e) => e.status === 'active')

export const isManager = (c: CompanyData, me: Employee) => capsFor(me).includes('manage')

export const dueOf = (a: Activity) => a.revisedDue ?? a.originalDue
export const isOpen = (a: Activity) => !['Accepted', 'Cancelled'].includes(a.status)
export const isOverdue = (a: Activity) => isOpen(a) && a.status !== 'Submitted for review' && dueOf(a) < TODAY

/** Who may see an activity: owner/admin see all; others see own, reviewed, project or led-department work. */
export function canSeeActivity(c: CompanyData, me: Employee, a: Activity) {
  if (capsFor(me).includes('manage')) return true
  if (a.ownerId === me.id || a.reviewerId === me.id) return true
  if (a.projectId) {
    const p = projectOf(c, a.projectId)
    if (p && (p.pmId === me.id || p.sponsorId === me.id || p.members.some((m) => m.personId === me.id))) return true
  }
  if (deptOf(c, a.dept)?.leadId === me.id) return true
  return false
}

export function originOf(c: CompanyData, a: Activity): { label: string; href: string; kind: 'Project' | 'Product' | 'Department' } {
  if (a.projectId) {
    const p = projectOf(c, a.projectId)
    return { label: `Project · ${p?.name ?? a.projectId}`, href: `/projects/${a.projectId}`, kind: 'Project' }
  }
  if (a.productId) {
    const p = productOf(c, a.productId)
    return { label: `${p?.kind ?? 'Product'} · ${p?.name ?? a.productId}`, href: `/products/${a.productId}`, kind: 'Product' }
  }
  return { label: `Department work · ${deptOf(c, a.dept)?.name ?? a.dept}`, href: `/departments/${a.dept}`, kind: 'Department' }
}

/** Four separate evidence dimensions — never combined into a single score. */
export function productivity(c: CompanyData, personId: string) {
  const inPeriod = (d: string) => d.startsWith(PERIOD.id)
  const mine = c.activities.filter((a) => a.ownerId === personId)
  const commitments = mine.filter((a) => a.status !== 'Cancelled' && inPeriod(dueOf(a)))
  const accepted = commitments.filter((a) => a.status === 'Accepted')
  const submitted = commitments.filter((a) => a.status === 'Submitted for review')
  const onTime = accepted.filter((a) => (a.acceptedAt ?? '') <= dueOf(a))
  const late = accepted.filter((a) => (a.acceptedAt ?? '') > dueOf(a))
  const revised = mine.filter((a) => a.revisedDue && (inPeriod(a.originalDue) || inPeriod(a.revisedDue)))
  const cancelled = mine.filter((a) => a.status === 'Cancelled' && inPeriod(a.originalDue))
  const reopened = mine.filter((a) => a.reworkCount > 0 && inPeriod(a.originalDue))
  const firstPass = accepted.filter((a) => a.reworkCount === 0)
  return { commitments, accepted, submitted, onTime, late, revised, cancelled, reopened, firstPass }
}

export function projectHealth(c: CompanyData, p: Project): { value: 'On track' | 'At risk' | 'Blocked'; reasons: string[]; manual?: string } {
  if (p.healthOverride) return { value: p.healthOverride.value, reasons: [p.healthOverride.reason], manual: `Manual override by ${firstName(empOf(c, p.healthOverride.by))} on ${p.healthOverride.at}` }
  const acts = c.activities.filter((a) => a.projectId === p.id)
  const reasons: string[] = []
  const blockedCritical = acts.filter((a) => a.status === 'Blocked' && (a.priority === 'Critical' || a.priority === 'High'))
  const overdue = acts.filter(isOverdue)
  const blocked = acts.filter((a) => a.status === 'Blocked')
  if (blockedCritical.length && overdue.some((a) => a.status === 'Blocked')) {
    reasons.push(...blockedCritical.map((a) => `Critical activity "${a.title}" is blocked and overdue`))
    return { value: 'At risk', reasons }
  }
  if (overdue.length) reasons.push(...overdue.map((a) => `"${a.title}" is past its agreed due date`))
  if (blocked.length) reasons.push(...blocked.map((a) => `"${a.title}" is blocked: ${a.blocker ?? 'no reason given'}`))
  if (reasons.length) return { value: 'At risk', reasons }
  return { value: 'On track', reasons: ['No overdue or blocked activities'] }
}

export const countable = (e: Expense) => e.status === 'Approved · unpaid' || e.status === 'Paid'

const dayMs = 86_400_000
const daysBetween = (from: string, to: string) => Math.max(0, Math.round((Date.parse(to) - Date.parse(from)) / dayMs) + 1)

export type CostLine = { personId: string; role: string; allocation: number; salary?: number; daysToDate: number; costToDate: number; projected: number; former?: boolean }

/**
 * Project cost = people cost (annual salary ÷ 365 × days on project × allocation %) + approved/paid expenses.
 * Current members are counted from project start; former members until the day they left.
 */
export function projectCost(c: CompanyData, p: Project) {
  const end = p.target < TODAY ? p.target : TODAY
  const line = (personId: string, role: string, allocation = 100, until?: string): CostLine => {
    const salary = empOf(c, personId)?.salary
    const stop = until && until < end ? until : end
    const daysToDate = p.start > TODAY ? 0 : daysBetween(p.start, stop)
    const daysTotal = daysBetween(p.start, until && until < p.target ? until : p.target)
    const rate = ((salary ?? 0) / 365) * (allocation / 100)
    return { personId, role, allocation, salary, daysToDate, costToDate: Math.round(rate * daysToDate), projected: Math.round(rate * daysTotal), former: !!until }
  }
  const people = [...p.members.map((m) => line(m.personId, m.role, m.allocation)), ...p.formerMembers.map((m) => line(m.personId, m.role, m.allocation, m.until))]
  const expenses = c.expenses.filter((e) => e.projectId === p.id)
  const approved = expenses.filter(countable)
  const pending = expenses.filter(pendingExpense)
  const peopleToDate = people.reduce((s, l) => s + l.costToDate, 0)
  const peopleProjected = people.reduce((s, l) => s + l.projected, 0)
  const expensesTotal = approved.reduce((s, e) => s + e.amount, 0)
  const pendingTotal = pending.reduce((s, e) => s + e.amount, 0)
  return {
    people,
    expenses,
    peopleToDate,
    peopleProjected,
    expensesTotal,
    pendingTotal,
    toDate: peopleToDate + expensesTotal,
    projected: peopleProjected + expensesTotal + pendingTotal,
    missingSalary: people.filter((l) => !l.salary).map((l) => l.personId),
  }
}
export const pendingExpense = (e: Expense) => e.status === 'Submitted' || e.status === 'Changes requested' || e.status === 'Draft'

export function productFinance(c: CompanyData, productId: string, period = PERIOD.id) {
  const rev = c.revenue.filter((r) => r.productId === productId && r.period === period)
  const recognized = rev.reduce((s, r) => s + r.recognized, 0)
  const invoiced = rev.reduce((s, r) => s + r.invoiced, 0)
  const collected = rev.reduce((s, r) => s + r.collected, 0)
  const lines = c.expenses
    .filter((e) => countable(e) && e.date.startsWith(period))
    .flatMap((e) => e.allocations.filter((a) => a.productId === productId).map((a) => ({ expense: e, amount: a.amount, kind: a.kind })))
  const pending = c.expenses.filter((e) => pendingExpense(e) && e.allocations.some((a) => a.productId === productId))
  const delivery = lines.filter((l) => l.kind === 'Delivery')
  const operating = lines.filter((l) => l.kind === 'Operating')
  const costOfDelivery = delivery.reduce((s, l) => s + l.amount, 0)
  const opex = operating.reduce((s, l) => s + l.amount, 0)
  const gross = recognized - costOfDelivery
  const operatingProfit = gross - opex
  const hasRevenue = rev.length > 0
  return { rev, recognized, invoiced, collected, delivery, operating, costOfDelivery, opex, gross, operatingProfit, totalExpense: costOfDelivery + opex, margin: recognized ? operatingProfit / recognized : 0, hasRevenue, pending }
}

export function deptCosts(c: CompanyData, deptId: string, period = PERIOD.id) {
  const rows = c.expenses.filter((e) => e.dept === deptId && countable(e) && e.date.startsWith(period))
  const pending = c.expenses.filter((e) => e.dept === deptId && pendingExpense(e))
  const byCat = rows.reduce<Record<string, number>>((m, e) => ((m[e.category] = (m[e.category] ?? 0) + e.amount), m), {})
  return { rows, pending, byCat, total: rows.reduce((s, e) => s + e.amount, 0) }
}

/** Who approves project budget/timeline changes. Falls back to the sponsor. */
export function projectApprovers(p: Project) {
  const fallback = [p.sponsorId].filter(Boolean)
  return {
    budget: p.approvers?.budget.length ? p.approvers.budget : fallback,
    timeline: p.approvers?.timeline.length ? p.approvers.timeline : fallback,
  }
}

/** Who approves department budget changes/expenses and reviews department-only work. Falls back to the lead, then the owner. */
export function deptApprovers(c: CompanyData, d: Department) {
  const owner = c.employees.find((e) => e.accessRole === 'owner')?.id
  const fallback = [d.leadId ?? owner].filter(Boolean) as string[]
  return {
    budget: d.approvers?.budget.length ? d.approvers.budget : fallback,
    work: d.approvers?.work.length ? d.approvers.work : fallback,
  }
}

export type DeptCostLine = { personId: string; salary?: number; projectAlloc: number; deptShare: number; toDate: number; deptToDate: number; projectToDate: number; deptProjected: number }

/**
 * Department cost (calendar year) = department people's time NOT allocated to projects
 * (salary × (100% − project allocation)) + approved expenses charged to the department without a project.
 * Time people spend on projects is costed on those projects instead, so nothing is counted twice.
 */
export function deptCost(c: CompanyData, d: Department) {
  const year = TODAY.slice(0, 4)
  const start = `${year}-01-01`
  const daysToDate = daysBetween(start, TODAY)
  const daysYear = daysBetween(start, `${year}-12-31`)
  const openProjects = c.projects.filter((p) => p.status !== 'Closed')
  const people: DeptCostLine[] = c.employees
    .filter((e) => e.dept === d.id && e.status === 'active')
    .map((e) => {
      const projectAlloc = Math.min(100, openProjects.reduce((s, p) => s + (p.members.find((m) => m.personId === e.id)?.allocation ?? (p.members.some((m) => m.personId === e.id) ? 100 : 0)), 0))
      const deptShare = 100 - projectAlloc
      const toDate = Math.round(((e.salary ?? 0) / 365) * daysToDate)
      const deptToDate = Math.round((toDate * deptShare) / 100)
      return { personId: e.id, salary: e.salary, projectAlloc, deptShare, toDate, deptToDate, projectToDate: toDate - deptToDate, deptProjected: Math.round((((e.salary ?? 0) / 365) * daysYear * deptShare) / 100) }
    })
  const expenses = c.expenses.filter((e) => e.dept === d.id && !e.projectId && e.date.startsWith(year))
  const expensesTotal = expenses.filter(countable).reduce((s, e) => s + e.amount, 0)
  const pendingTotal = expenses.filter(pendingExpense).reduce((s, e) => s + e.amount, 0)
  const peopleToDate = people.reduce((s, l) => s + l.deptToDate, 0)
  const peopleProjected = people.reduce((s, l) => s + l.deptProjected, 0)
  const onProjectsToDate = people.reduce((s, l) => s + l.projectToDate, 0)
  const projects = c.projects
    .filter((p) => p.ownerDept === d.id || p.deptIds.includes(d.id))
    .map((p) => ({ project: p, owned: p.ownerDept === d.id, cost: projectCost(c, p) }))
  return {
    year,
    people,
    expenses,
    peopleToDate,
    peopleProjected,
    expensesTotal,
    pendingTotal,
    onProjectsToDate,
    projects,
    toDate: peopleToDate + expensesTotal,
    projected: peopleProjected + expensesTotal + pendingTotal,
    missingSalary: people.filter((l) => !l.salary).map((l) => l.personId),
  }
}

export function sourceHref(r: ApprovalRound) {
  switch (r.itemType) {
    case 'Proposal':
      return `/proposals?id=${r.itemId}`
    case 'Backlog item':
      return `/backlog?id=${r.itemId}`
    case 'Expense':
      return `/finance?tab=expenses&id=${r.itemId}`
    case 'Project stage':
      return `/projects/${r.itemId}?tab=workflow`
    case 'Project change':
      return `/projects/${r.itemId}`
    case 'Department budget':
      return `/departments?dept=${r.itemId}`
    case 'Activity acceptance':
      return `/activities?id=${r.itemId}`
    case 'Release':
      return `/backlog/releases/${r.itemId}`
    case 'Complaint resolution':
      return `/complaints?case=${r.itemId}`
  }
}

export function contextInfo(c: CompanyData, key: string): { label: string; href: string; memberIds: string[] } {
  const [type, id] = key.split(':')
  if (type === 'project') {
    const p = projectOf(c, id)
    return { label: p?.name ?? id, href: `/projects/${id}`, memberIds: p ? [p.pmId, p.sponsorId, ...p.members.map((m) => m.personId)] : [] }
  }
  if (type === 'department') {
    const d = deptOf(c, id)
    return { label: d?.name ?? id, href: `/departments/${id}`, memberIds: c.employees.filter((e) => e.dept === id).map((e) => e.id) }
  }
  const p = productOf(c, id)
  return { label: p?.name ?? id, href: `/products/${id}`, memberIds: p ? [p.ownerId, ...c.employees.filter((e) => e.dept === p.dept).map((e) => e.id)] : [] }
}

export function canAccessContext(c: CompanyData, me: Employee, ref: ContextRef) {
  if (capsFor(me).includes('manage')) return true
  return contextInfo(c, ctxKey(ref)).memberIds.includes(me.id)
}

export const canSeeAnnouncement = (a: CompanyData['announcements'][number], me: Employee, manage: boolean) =>
  manage || a.senderId === me.id || a.audience.type === 'all' || a.audience.deptIds.includes(me.dept)

export const audienceOf = (c: CompanyData, a: CompanyData['announcements'][number]) =>
  activeEmployees(c).filter((e) => a.audience.type === 'all' || a.audience.deptIds.includes(e.dept))

export function pendingFor(c: CompanyData, personId: string, canCase: boolean) {
  return c.approvals.filter((r) => (!r.restricted || canCase) && r.stages.some((s) => s.decisions.some((d) => d.personId === personId && d.decision === 'pending')))
}

export type Notice = { id: string; title: string; body: string; href: string; at: string }

/** Notifications derived from live records, scoped to the signed-in person. In-app only. */
export function noticesFor(c: CompanyData, me: Employee, canCase: boolean): Notice[] {
  const out: Notice[] = []
  pendingFor(c, me.id, canCase).forEach((r) => out.push({ id: `apr-${r.id}`, title: `Your decision is needed: ${r.itemTitle}`, body: `${r.itemType} · ${r.workflowVersion}`, href: `/approvals?id=${r.id}`, at: r.submittedAt }))
  c.activities.filter((a) => a.reviewerId === me.id && a.status === 'Submitted for review').forEach((a) => out.push({ id: `rev-${a.id}`, title: `Review requested: ${a.title}`, body: `Submitted by ${firstName(empOf(c, a.ownerId))}`, href: `/activities?id=${a.id}`, at: a.history.at(-1)?.at ?? '' }))
  c.activities.filter((a) => a.ownerId === me.id && a.status === 'Reopened').forEach((a) => out.push({ id: `reo-${a.id}`, title: `Reopened: ${a.title}`, body: a.evidence ?? 'Changes requested by reviewer', href: `/activities?id=${a.id}`, at: '' }))
  c.announcements.filter((a) => a.status === 'Published' && canSeeAnnouncement(a, me, false) && a.ackRequired && !a.acks.includes(me.id)).forEach((a) => out.push({ id: `ann-${a.id}`, title: `Announcement: ${a.title}`, body: 'Acknowledgment requested', href: `/announcements?id=${a.id}`, at: a.publishedAt ?? '' }))
  if (canCase) c.complaints.filter((x) => x.status !== 'Resolved').forEach((x) => out.push({ id: `cmp-${x.id}`, title: 'Complaint case open (in-app only)', body: 'Open the case inbox to view', href: `/complaints?case=${x.id}`, at: x.receivedAt }))
  c.invitations.filter((i) => i.createdBy === me.id && i.status === 'Accepted').forEach((i) => out.push({ id: `inv-${i.id}`, title: `${i.name} accepted your invitation`, body: i.designation, href: `/employees/${i.employeeId}`, at: i.history.at(-1)?.at ?? '' }))
  return out
}
