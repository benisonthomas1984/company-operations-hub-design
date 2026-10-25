'use client'

import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { initialActivities, initialApprovals, type Activity, type ApprovalRound, type Decision } from './fixtures'

/**
 * Prototype-only client store. It simulates canonical records shared by every view
 * (one activity record appears in profile, project, department, dossier).
 * Emergent: replace with server state + server-side authorization. Review
 * perspectives are a design-review tool, NOT an impersonation privilege.
 */

export type PerspectiveId = 'maya' | 'ravi' | 'noor' | 'ana' | 'elena' | 'nina' | 'sam' | 'luca'

export type Perspective = {
  id: PerspectiveId
  label: string
  role: string
  caps: Capability[]
}

export type Capability =
  | 'finance.read'
  | 'finance.manage'
  | 'settings.manage'
  | 'complaints.case'
  | 'org.edit'
  | 'board.member'
  | 'project.lead'
  | 'personal.restricted'
  | 'announcements.publish'

export const perspectives: Perspective[] = [
  { id: 'maya', label: 'Maya Okafor', role: 'Owner · authorized finance', caps: ['finance.read', 'settings.manage', 'org.edit', 'board.member', 'personal.restricted'] },
  { id: 'ravi', label: 'Ravi Menon', role: 'CEO · board member', caps: ['finance.read', 'board.member', 'org.edit'] },
  { id: 'noor', label: 'Noor Haddad', role: 'CTO · department & project lead', caps: ['board.member', 'project.lead'] },
  { id: 'luca', label: 'Luca Bianchi', role: 'Marketing · project manager', caps: ['project.lead', 'announcements.publish'] },
  { id: 'ana', label: 'Ana Ribeiro', role: 'Developer · mailbox owner', caps: [] },
  { id: 'elena', label: 'Elena Petrova', role: 'HR lead · explicit complaint case role', caps: ['complaints.case', 'announcements.publish', 'personal.restricted'] },
  { id: 'nina', label: 'Nina Kowalski', role: 'Finance user', caps: ['finance.read', 'finance.manage'] },
  { id: 'sam', label: 'Sam Carter', role: 'Support · complaint submitter', caps: [] },
]

type Store = {
  perspective: Perspective
  setPerspective: (id: PerspectiveId) => void
  companyId: string
  setCompanyId: (id: string) => void
  can: (cap: Capability) => boolean
  activities: Activity[]
  updateActivity: (id: string, patch: Partial<Activity>) => void
  approvals: ApprovalRound[]
  decide: (approvalId: string, personId: string, decision: Decision, note?: string) => void
  aiCreditsUsed: number
  aiCreditsLimit: number
  spendAi: (opId: string, credits: number) => 'charged' | 'duplicate' | 'exhausted'
  setAiExhausted: (v: boolean) => void
}

const StoreContext = createContext<Store | null>(null)

export function AppStoreProvider({ children }: { children: React.ReactNode }) {
  const [perspectiveId, setPerspective] = useState<PerspectiveId>('maya')
  const [companyId, setCompanyId] = useState('co_comet_works')
  const [activities, setActivities] = useState(initialActivities)
  const [approvals, setApprovals] = useState(initialApprovals)
  const [aiCreditsUsed, setUsed] = useState(7420)
  const [aiCreditsLimit] = useState(10000)
  const [settledOps, setSettledOps] = useState<string[]>([])

  const perspective = perspectives.find((p) => p.id === perspectiveId)!

  const can = useCallback((cap: Capability) => perspective.caps.includes(cap), [perspective])

  const updateActivity = useCallback((id: string, patch: Partial<Activity>) => {
    setActivities((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch, revision: a.revision + 1 } : a)))
  }, [])

  const decide = useCallback((approvalId: string, personId: string, decision: Decision, note?: string) => {
    setApprovals((prev) =>
      prev.map((r) => {
        if (r.id !== approvalId) return r
        const stages = r.stages.map((s) => ({
          ...s,
          decisions: s.decisions.map((d) =>
            d.personId === personId && (d.decision === 'pending')
              ? { ...d, decision, note, at: '2026-10-25 · just now' }
              : d,
          ),
        }))
        const all = stages.flatMap((s) => s.decisions)
        let status: ApprovalRound['status'] = r.status
        if (all.some((d) => d.decision === 'rejected')) status = 'Rejected'
        else if (all.some((d) => d.decision === 'changes')) status = 'Changes requested'
        else if (all.every((d) => d.decision === 'approved')) status = 'Approved'
        // ordered stages: unlock next stage when previous is fully approved
        const unlocked = stages.map((s, i) => {
          if (i === 0) return s
          const prevDone = stages[i - 1].decisions.every((d) => d.decision === 'approved')
          return prevDone
            ? { ...s, decisions: s.decisions.map((d) => (d.decision === 'blocked' ? { ...d, decision: 'pending' as Decision } : d)) }
            : s
        })
        return { ...r, stages: unlocked, status }
      }),
    )
  }, [])

  const spendAi = useCallback(
    (opId: string, credits: number) => {
      if (settledOps.includes(opId)) return 'duplicate' as const
      if (aiCreditsUsed + credits > aiCreditsLimit) return 'exhausted' as const
      setSettledOps((p) => [...p, opId])
      setUsed((u) => u + credits)
      return 'charged' as const
    },
    [settledOps, aiCreditsUsed, aiCreditsLimit],
  )

  const setAiExhausted = useCallback((v: boolean) => setUsed(v ? 10000 : 7420), [])

  const value = useMemo<Store>(
    () => ({ perspective, setPerspective, companyId, setCompanyId, can, activities, updateActivity, approvals, decide, aiCreditsUsed, aiCreditsLimit, spendAi, setAiExhausted }),
    [perspective, companyId, can, activities, updateActivity, approvals, decide, aiCreditsUsed, aiCreditsLimit, spendAi, setAiExhausted],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within AppStoreProvider')
  return ctx
}
