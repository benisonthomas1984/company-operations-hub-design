import { PERIOD, TODAY, ctxKey, type Activity, type ApprovalRound, type CompanyData, type ContextRef, type Employee, type Expense, type Project } from './fixtures'
import { capsFor } from './store'

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

export function sourceHref(r: ApprovalRound) {
  switch (r.itemType) {
    case 'Proposal':
      return `/proposals/${r.itemId}`
    case 'Backlog item':
      return `/backlog/${r.itemId}`
    case 'Expense':
      return `/finance?tab=expenses&id=${r.itemId}`
    case 'Project stage':
      return `/projects/${r.itemId}?tab=workflow`
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
