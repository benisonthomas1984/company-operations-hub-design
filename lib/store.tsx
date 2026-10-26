'use client'

/**
 * Prototype-only persisted store. Simulates the central API: one canonical record
 * per business object, scoped to the signed-in account's company, with private
 * per-person state cleared on logout. Persistence uses browser storage so created
 * records and deep links survive refresh. Emergent: replace with server state and
 * server-side authorization; nothing here is production authentication.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import {
  TODAY,
  demoCompany,
  freshCompany,
  packages,
  type ApprovalRound,
  type CompanyData,
  type Decision,
  type Employee,
} from './fixtures'

const KEY = 'coh-prototype-v3'

export type Account = { email: string; password: string; personId: string; companyId: string }
export type DossierTurn = { id: string; q: string; credits: number }
export type PrivateState = { dossier: DossierTurn[]; mailDisconnected?: boolean; readNotifications: string[] }
export type SignupDraft = { packageId: string; interval: 'month' | 'year' }

type DB = {
  v: 2
  companies: Record<string, CompanyData>
  accounts: Account[]
  session: { personId: string; companyId: string } | null
  signup: SignupDraft | null
  private: Record<string, PrivateState>
}

function seed(): DB {
  const demo = demoCompany()
  const demoAccounts: Account[] = demo.employees.filter((e) => e.status === 'active' && e.email).map((e) => ({ email: e.email, password: 'demo', personId: e.id, companyId: demo.id }))
  return { v: 2, companies: { [demo.id]: demo }, accounts: demoAccounts, session: null, signup: null, private: {} }
}

export type Cap = 'manage' | 'org.edit' | 'finance.read' | 'finance.manage' | 'announce' | 'settings' | 'complaints.case'

export function capsFor(e: Employee | undefined): Cap[] {
  if (!e) return []
  const caps: Cap[] = []
  const r = e.accessRole
  if (r === 'owner' || r === 'admin') caps.push('manage', 'settings', 'org.edit')
  if (r === 'hr') caps.push('org.edit')
  if (r === 'owner' || r === 'admin' || r === 'finance' || e.financeRead) caps.push('finance.read')
  if (r === 'owner' || r === 'finance') caps.push('finance.manage')
  if (r === 'owner' || r === 'hr') caps.push('announce')
  if (e.complaintHandler) caps.push('complaints.case')
  return caps
}

export const nowStamp = () => {
  const d = new Date()
  return `${TODAY} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export type MutateCtx = { me: Employee; now: string; id: (prefix: string) => string; audit: (action: string, target: string, detail?: string) => void }

type Store = {
  ready: boolean
  company: CompanyData | null
  me: Employee | null
  session: DB['session']
  signup: SignupDraft | null
  accounts: Account[]
  can: (cap: Cap) => boolean
  mutate: (fn: (c: CompanyData, ctx: MutateCtx) => void) => void
  login: (email: string, password: string) => string | null
  loginAs: (personId: string) => void
  logout: () => void
  setSignupDraft: (d: SignupDraft | null) => void
  signupOwner: (input: { fullName: string; email: string; password: string; companyName: string }) => string | null
  acceptInvite: (inviteId: string, input: { companyId: string; fullName: string; password: string; phone: string; location: string }) => string | null
  findInvite: (inviteId: string) => { company: CompanyData; invite: CompanyData['invitations'][number] } | null
  decide: (approvalId: string, decision: Decision, note?: string) => void
  spendAi: (opId: string, credits: number) => 'charged' | 'duplicate' | 'exhausted'
  priv: PrivateState
  setPriv: (fn: (p: PrivateState) => PrivateState) => void
  resetDemo: () => void
  loadSampleData: () => void
}

const StoreContext = createContext<Store | null>(null)
const emptyPriv: PrivateState = { dossier: [], readNotifications: [] }

/** Applies the business consequences of a completed approval round to its source record. */
function applyOutcome(c: CompanyData, r: ApprovalRound, now: string) {
  const approverIds = r.stages.flatMap((s) => s.decisions.map((d) => d.personId))
  if (r.itemType === 'Proposal') {
    const p = c.proposals.find((x) => x.id === r.itemId)
    if (!p) return
    if (r.status === 'Approved') p.status = 'Approved'
    if (r.status === 'Rejected') p.status = 'Rejected'
    if (r.status === 'Changes requested') p.status = 'Changes requested'
    p.updated = now.slice(0, 10)
  }
  if (r.itemType === 'Backlog item') {
    const b = c.backlog.find((x) => x.id === r.itemId)
    if (!b) return
    if (r.status === 'Approved') {
      b.status = b.projectIds.length ? 'In delivery' : 'Committed'
      b.committedTarget = b.proposedTarget
      b.committedBy = { ids: approverIds, at: now }
      if (b.projectIds.length && !b.actualStart) b.actualStart = now.slice(0, 10)
      b.history.push({ at: now, by: 'system', text: `Target ${b.proposedTarget} committed — approved by all ${approverIds.length} approvers` })
    }
    if (r.status === 'Changes requested') b.status = 'Changes requested'
    if (r.status === 'Rejected') b.status = 'Rejected'
  }
  if (r.itemType === 'Expense') {
    const e = c.expenses.find((x) => x.id === r.itemId)
    if (!e) return
    if (r.status === 'Approved') e.status = 'Approved · unpaid'
    if (r.status === 'Changes requested') e.status = 'Changes requested'
    if (r.status === 'Rejected') e.status = 'Rejected'
    e.history.push({ at: now, by: 'system', text: `Approval ${r.id}: ${r.status}` })
  }
  if (r.itemType === 'Project stage') {
    const p = c.projects.find((x) => x.id === r.itemId)
    if (!p) return
    const idx = p.stages.findIndex((s) => s.approvalId === r.id)
    if (idx < 0) return
    if (r.status === 'Approved') {
      p.stages[idx].status = 'Done'
      if (p.stages[idx + 1]) p.stages[idx + 1].status = 'Current'
      else p.status = 'Closed'
      p.history.push({ at: now, by: 'system', text: `Stage "${p.stages[idx].name}" approved by all required approvers — advanced` })
    }
    if (r.status !== 'Pending' && r.status !== 'Approved') p.stages[idx].approvalId = undefined
  }
  if (r.itemType === 'Release') {
    const rel = c.releases.find((x) => x.id === r.itemId)
    if (!rel) return
    if (r.status === 'Approved') rel.status = 'Approved'
    if (r.status === 'Changes requested' || r.status === 'Rejected') rel.status = 'Planned'
    rel.history.push({ at: now, by: 'system', text: `Release approval ${r.id}: ${r.status}` })
  }
}

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<DB | null>(null)
  const loaded = useRef(false)

  useEffect(() => {
    if (loaded.current) return
    loaded.current = true
    try {
      const raw = window.localStorage.getItem(KEY)
      const parsed = raw ? (JSON.parse(raw) as DB) : null
      setDb(parsed && parsed.v === 2 ? parsed : seed())
    } catch {
      setDb(seed())
    }
  }, [])

  useEffect(() => {
    if (!db) return
    const next = JSON.stringify(db)
    if (window.localStorage.getItem(KEY) !== next) window.localStorage.setItem(KEY, next)
  }, [db])

  // Keeps every open tab (e.g. the org chart opened in a new tab) on the same record.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== KEY || !e.newValue) return
      try {
        const parsed = JSON.parse(e.newValue) as DB
        if (parsed.v === 2) setDb(parsed)
      } catch {}
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const company = db?.session ? (db.companies[db.session.companyId] ?? null) : null
  const me = company && db?.session ? (company.employees.find((e) => e.id === db.session!.personId) ?? null) : null
  const caps = useMemo(() => capsFor(me ?? undefined), [me])
  const can = useCallback((cap: Cap) => caps.includes(cap), [caps])
  const privKey = db?.session ? `${db.session.companyId}:${db.session.personId}` : ''

  const update = useCallback((fn: (d: DB) => void) => {
    setDb((prev) => {
      if (!prev) return prev
      const next = structuredClone(prev)
      fn(next)
      return next
    })
  }, [])

  const mutate = useCallback(
    (fn: (c: CompanyData, ctx: MutateCtx) => void) => {
      update((d) => {
        if (!d.session) return
        const c = d.companies[d.session.companyId]
        const meNow = c.employees.find((e) => e.id === d.session!.personId)!
        const now = nowStamp()
        const ctx: MutateCtx = {
          me: meNow,
          now,
          id: (prefix) => `${prefix}-${String(++c.seq).padStart(4, '0')}`,
          audit: (action, target, detail = '') => c.audit.unshift({ id: `AUD-${++c.seq}`, at: now, actor: meNow.id, action, target, detail }),
        }
        fn(c, ctx)
      })
    },
    [update],
  )

  const login = useCallback(
    (email: string, password: string) => {
      if (!db) return 'Not ready'
      const acc = db.accounts.find((a) => a.email.toLowerCase() === email.trim().toLowerCase())
      if (!acc || acc.password !== password) return 'Email or password is incorrect.'
      const emp = db.companies[acc.companyId]?.employees.find((e) => e.id === acc.personId)
      if (!emp || emp.status !== 'active') return 'This account is not active.'
      update((d) => {
        d.session = { personId: acc.personId, companyId: acc.companyId }
      })
      return null
    },
    [db, update],
  )

  const loginAs = useCallback(
    (personId: string) =>
      update((d) => {
        d.session = { personId, companyId: 'co_comet_works' }
      }),
    [update],
  )

  const logout = useCallback(
    () =>
      update((d) => {
        if (d.session) delete d.private[`${d.session.companyId}:${d.session.personId}`]
        d.session = null
      }),
    [update],
  )

  const setSignupDraft = useCallback((s: SignupDraft | null) => update((d) => void (d.signup = s)), [update])

  const signupOwner = useCallback(
    (input: { fullName: string; email: string; password: string; companyName: string }) => {
      if (!db) return 'Not ready'
      const email = input.email.trim().toLowerCase()
      if (db.accounts.some((a) => a.email.toLowerCase() === email)) return 'An account with this email already exists. Log in instead.'
      const cid = `co_${Date.now().toString(36)}`
      const pid = `own_${Date.now().toString(36)}`
      update((d) => {
        d.companies[cid] = freshCompany(cid, input.companyName.trim(), { id: pid, fullName: input.fullName.trim(), email, designation: 'Founder & Owner' }, d.signup?.packageId ?? 'pkg_business', '', '')
        d.accounts.push({ email, password: input.password, personId: pid, companyId: cid })
        d.session = { personId: pid, companyId: cid }
      })
      return null
    },
    [db, update],
  )

  const findInvite = useCallback(
    (inviteId: string) => {
      if (!db) return null
      for (const company of Object.values(db.companies)) {
        const invite = company.invitations.find((i) => i.id === inviteId)
        if (invite) return { company, invite }
      }
      return null
    },
    [db],
  )

  const acceptInvite = useCallback(
    (inviteId: string, input: { companyId: string; fullName: string; password: string; phone: string; location: string }) => {
      if (!db) return 'Not ready'
      const c = db.companies[input.companyId]
      const inv = c?.invitations.find((i) => i.id === inviteId)
      if (!inv) return 'Invitation not found.'
      if (inv.status === 'Accepted') return 'This invitation has already been accepted. Log in instead.'
      if (inv.status === 'Cancelled') return 'This invitation was cancelled by the company.'
      if (inv.status === 'Expired' || inv.expiresAt < TODAY) return 'This invitation has expired. Ask the company to resend it.'
      if (db.accounts.some((a) => a.email.toLowerCase() === inv.email.toLowerCase())) return 'This email is already a member. Log in instead.'
      update((d) => {
        const cc = d.companies[input.companyId]
        const ii = cc.invitations.find((i) => i.id === inviteId)!
        const now = nowStamp()
        const pid = ii.vacancyId ?? `emp_${(++cc.seq).toString(36)}${Date.now().toString(36).slice(-3)}`
        const record: Employee = {
          id: pid,
          fullName: input.fullName.trim() || ii.name,
          designation: ii.designation,
          dept: ii.dept,
          email: ii.email,
          status: 'active',
          location: input.location || '—',
          joined: ii.start || TODAY,
          accessRole: ii.accessRole === 'owner' ? 'member' : ii.accessRole,
          phone: input.phone,
          invitationId: ii.id,
        }
        const existing = cc.employees.findIndex((e) => e.id === pid)
        if (existing >= 0) cc.employees[existing] = record
        else cc.employees.push(record)
        const hasManager = cc.relationships.some((r) => r.from === pid && r.type === 'direct')
        if (!hasManager && ii.managerId) cc.relationships.push({ id: `rel_${pid}`, from: pid, to: ii.managerId, type: 'direct', primary: true })
        if (hasManager && ii.managerId) cc.relationships.forEach((r) => r.from === pid && r.type === 'direct' && (r.to = ii.managerId))
        if (ii.functionalId) cc.relationships.push({ id: `rel_${pid}_f`, from: pid, to: ii.functionalId, type: 'functional' })
        ii.status = 'Accepted'
        ii.employeeId = pid
        ii.history.push({ at: now, text: `Accepted by ${record.fullName} — employee activated` })
        d.accounts.push({ email: ii.email, password: input.password, personId: pid, companyId: input.companyId })
        d.session = { personId: pid, companyId: input.companyId }
      })
      return null
    },
    [db, update],
  )

  const decide = useCallback(
    (approvalId: string, decision: Decision, note?: string) =>
      mutate((c, { me: who, now }) => {
        const r = c.approvals.find((x) => x.id === approvalId)
        if (!r) return
        let acted = false
        r.stages.forEach((s) =>
          s.decisions.forEach((d) => {
            if (d.personId === who.id && d.decision === 'pending' && !acted) {
              d.decision = decision
              d.note = note
              d.at = now
              acted = true
            }
          }),
        )
        if (!acted) return
        r.stages.forEach((s, i) => {
          if (i === 0) return
          if (r.stages[i - 1].decisions.every((d) => d.decision === 'approved')) s.decisions.forEach((d) => d.decision === 'blocked' && (d.decision = 'pending'))
        })
        const all = r.stages.flatMap((s) => s.decisions)
        if (all.some((d) => d.decision === 'rejected')) r.status = 'Rejected'
        else if (all.some((d) => d.decision === 'changes')) r.status = 'Changes requested'
        else if (all.every((d) => d.decision === 'approved')) r.status = 'Approved'
        r.history.push({ at: now, by: who.id, text: `${decision === 'approved' ? 'Approved' : decision === 'changes' ? 'Requested changes' : 'Rejected'}${note ? ` — ${note}` : ''}` })
        if (r.status !== 'Pending') applyOutcome(c, r, now)
      }),
    [mutate],
  )

  const spendAi = useCallback(
    (opId: string, credits: number) => {
      if (!company) return 'exhausted' as const
      if (company.credits.ops.includes(opId)) return 'duplicate' as const
      if (company.credits.used + credits > company.credits.limit) return 'exhausted' as const
      mutate((c) => {
        c.credits.ops.push(opId)
        c.credits.used += credits
      })
      return 'charged' as const
    },
    [company, mutate],
  )

  const priv = (db && privKey && db.private[privKey]) || emptyPriv
  const setPriv = useCallback(
    (fn: (p: PrivateState) => PrivateState) =>
      update((d) => {
        if (!d.session) return
        const k = `${d.session.companyId}:${d.session.personId}`
        d.private[k] = fn(d.private[k] ?? emptyPriv)
      }),
    [update],
  )

  const resetDemo = useCallback(() => setDb(seed()), [])

  /**
   * DEV ONLY — remove before production. Replaces the signed-in company's records with the
   * full sample dataset (company name, founder/owner, people, org, finance, everything) and
   * re-points the current login to the sample owner so the same credentials keep working.
   */
  const loadSampleData = useCallback(
    () =>
      update((d) => {
        if (!d.session) return
        const cid = d.session.companyId
        const prevPersonId = d.session.personId
        const sample = demoCompany()
        sample.id = cid
        sample.onboarding.done = true
        const owner = sample.employees.find((e) => e.accessRole === 'owner') ?? sample.employees[0]
        d.companies[cid] = sample
        d.accounts.forEach((a) => {
          if (a.companyId === cid && a.personId === prevPersonId) a.personId = owner.id
        })
        Object.keys(d.private).forEach((k) => k.startsWith(`${cid}:`) && delete d.private[k])
        d.session = { companyId: cid, personId: owner.id }
      }),
    [update],
  )

  const value = useMemo<Store>(
    () => ({
      ready: !!db,
      company,
      me,
      session: db?.session ?? null,
      signup: db?.signup ?? null,
      accounts: db?.accounts ?? [],
      can,
      mutate,
      login,
      loginAs,
      logout,
      setSignupDraft,
      signupOwner,
      acceptInvite,
      findInvite,
      decide,
      spendAi,
      priv,
      setPriv,
      resetDemo,
      loadSampleData,
    }),
    [db, company, me, can, mutate, login, loginAs, logout, setSignupDraft, signupOwner, acceptInvite, findInvite, decide, spendAi, priv, setPriv, resetDemo, loadSampleData],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within AppStoreProvider')
  return ctx
}

/** Hub screens only render inside the authenticated shell, so company/me are guaranteed. */
export function useHub() {
  const s = useStore()
  return s as Store & { company: CompanyData; me: Employee }
}

export const packageById = (id: string) => packages.find((p) => p.id === id) ?? packages[2]
