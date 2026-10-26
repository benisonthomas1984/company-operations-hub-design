import type { CompanyData, Employee } from '@/lib/fixtures'

export const CARD_W = 184
export const CARD_H = 60
const GAP_X = 28
const ROW_H = 120

export const placed = (c: CompanyData) => c.employees.filter((e) => e.status !== 'inactive')

export function directManager(c: CompanyData, id: string) {
  return c.relationships.find((r) => r.from === id && r.type === 'direct')?.to
}

/** Every position that sits under `id` in the direct reporting tree. */
export function descendants(c: CompanyData, id: string) {
  const out = new Set<string>()
  const walk = (cur: string) => {
    for (const r of c.relationships) {
      if (r.type === 'direct' && r.to === cur && !out.has(r.from)) {
        out.add(r.from)
        walk(r.from)
      }
    }
  }
  walk(id)
  return out
}

export function positionLabel(e: Employee) {
  return e.status === 'vacancy' ? `${e.designation} (open)` : `${e.designation} — ${e.fullName}`
}

/** Tidy top-down tree built from direct reporting lines. */
export function treeLayout(c: CompanyData) {
  const nodes = placed(c)
  const ids = new Set(nodes.map((n) => n.id))
  const kids: Record<string, string[]> = {}
  const roots: string[] = []
  for (const n of nodes) {
    const m = directManager(c, n.id)
    if (m && ids.has(m) && m !== n.id) (kids[m] ??= []).push(n.id)
    else roots.push(n.id)
  }
  const width: Record<string, number> = {}
  const seen = new Set<string>()
  const measure = (id: string): number => {
    if (seen.has(id)) return 0
    seen.add(id)
    const ch = kids[id] ?? []
    const w = ch.length ? ch.reduce((s, k) => s + measure(k), 0) : CARD_W + GAP_X
    width[id] = Math.max(w, CARD_W + GAP_X)
    return width[id]
  }
  roots.forEach(measure)
  nodes.forEach((n) => !seen.has(n.id) && (roots.push(n.id), measure(n.id)))

  const pos: Record<string, { x: number; y: number }> = {}
  const done = new Set<string>()
  const place = (id: string, left: number, depth: number) => {
    if (done.has(id)) return
    done.add(id)
    pos[id] = { x: left + (width[id] - CARD_W) / 2, y: 20 + depth * ROW_H }
    let x = left
    for (const k of kids[id] ?? []) {
      place(k, x, depth + 1)
      x += width[k] ?? 0
    }
  }
  let x = 20
  for (const r of roots) {
    place(r, x, 0)
    x += width[r] ?? 0
  }
  return pos
}

export function setDirectManager(co: CompanyData, personId: string, managerId: string) {
  co.relationships = co.relationships.filter((r) => !(r.from === personId && r.type === 'direct'))
  if (managerId && managerId !== personId) co.relationships.push({ id: `rel_${personId}_${managerId}`, from: personId, to: managerId, type: 'direct', primary: true })
}

/** Removable = open positions, or name-only placeholders that never had a login. */
export const isRemovable = (e: Employee) => e.status === 'vacancy' || (e.accessRole !== 'owner' && !e.email && e.status === 'active')

/** Remove a position; its direct reports move up to its manager. */
export function removePosition(co: CompanyData, id: string) {
  const up = directManager(co, id) ?? ''
  for (const r of co.relationships) if (r.to === id && r.type === 'direct') r.to = up
  co.relationships = co.relationships.filter((r) => r.from !== id && r.to !== id && r.to !== '')
  co.employees = co.employees.filter((e) => e.id !== id)
  delete co.layout[id]
}

/** Move an existing employee into an open position; the open position is consumed. */
export function assignToPosition(co: CompanyData, personId: string, vacancyId: string) {
  const vac = co.employees.find((e) => e.id === vacancyId)
  const person = co.employees.find((e) => e.id === personId)
  if (!vac || !person) return
  person.designation = vac.designation
  person.dept = vac.dept
  const mgr = directManager(co, vacancyId)
  for (const r of co.relationships) if (r.to === vacancyId) r.to = personId
  co.relationships = co.relationships.filter((r) => r.from !== vacancyId)
  setDirectManager(co, personId, mgr && mgr !== personId ? mgr : '')
  if (co.layout[vacancyId]) co.layout[personId] = co.layout[vacancyId]
  delete co.layout[vacancyId]
  co.employees = co.employees.filter((e) => e.id !== vacancyId)
}
