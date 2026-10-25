'use client'

import { useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Minus, Plus, RotateCcw, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useHub } from '@/lib/store'
import { deptColorCls, relLabel, type CompanyData, type Employee, type RelType } from '@/lib/fixtures'
import { managerOf } from '@/lib/derive'
import { Select } from '@/components/hub/form'
import { cn } from '@/lib/utils'

const CARD_W = 184
const CARD_H = 60
const COL_W = 420
const relStyle: Record<RelType, { stroke: string; dash?: string }> = {
  direct: { stroke: 'var(--foreground)' },
  project: { stroke: 'var(--info)', dash: '6 4' },
  functional: { stroke: 'var(--muted-foreground)', dash: '2 4' },
}

export function defaultLayout(c: CompanyData) {
  const pos: Record<string, { x: number; y: number }> = {}
  const people = c.employees.filter((e) => e.status !== 'inactive')
  const exec = c.departments.find((d) => d.color === 'exec')
  const others = c.departments.filter((d) => d.id !== exec?.id)
  const width = Math.max(others.length, 1) * COL_W
  const execPeople = people.filter((p) => p.dept === exec?.id)
  execPeople.forEach((p, i) => {
    const total = execPeople.length
    pos[p.id] = { x: width / 2 - (total * (CARD_W + 24)) / 2 + i * (CARD_W + 24) + 12, y: 40 }
  })
  others.forEach((d, col) => {
    const members = people.filter((p) => p.dept === d.id).sort((a, b) => (a.id === d.leadId ? -1 : b.id === d.leadId ? 1 : 0))
    members.forEach((p, i) => {
      if (i === 0) pos[p.id] = { x: col * COL_W + (COL_W - CARD_W) / 2, y: 200 }
      else {
        const k = i - 1
        pos[p.id] = { x: col * COL_W + 16 + (k % 2) * (CARD_W + 20), y: 300 + Math.floor(k / 2) * (CARD_H + 28) }
      }
    })
  })
  return pos
}

export function OrgCanvas({ compact = false }: { compact?: boolean }) {
  const { company: c, can, mutate } = useHub()
  const canEdit = can('org.edit')
  const [zoom, setZoom] = useState(compact ? 0.7 : 0.85)
  const [selId, setSelId] = useState<string | null>(null)
  const [showTypes, setShowTypes] = useState<Record<RelType, boolean>>({ direct: true, project: true, functional: true })
  const [localPos, setLocalPos] = useState<Record<string, { x: number; y: number }>>({})
  const drag = useRef<{ id: string; dx: number; dy: number; moved: boolean } | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const people = c.employees.filter((e) => e.status !== 'inactive')
  const base = useMemo(() => defaultLayout(c), [c])
  const posOf = (id: string) => localPos[id] ?? c.layout[id] ?? base[id] ?? { x: 0, y: 0 }
  const maxX = Math.max(1200, ...people.map((p) => posOf(p.id).x + CARD_W + 40))
  const maxY = Math.max(600, ...people.map((p) => posOf(p.id).y + CARD_H + 60))
  const rels = c.relationships.filter((r) => showTypes[r.type] && people.some((p) => p.id === r.from) && people.some((p) => p.id === r.to))
  const sel = people.find((p) => p.id === selId)

  const toCanvas = (e: React.PointerEvent) => {
    const rect = svgRef.current!.getBoundingClientRect()
    return { x: (e.clientX - rect.left) / zoom, y: (e.clientY - rect.top) / zoom }
  }

  const onDown = (e: React.PointerEvent, id: string) => {
    const p = toCanvas(e)
    const cur = posOf(id)
    drag.current = { id, dx: p.x - cur.x, dy: p.y - cur.y, moved: false }
    ;(e.target as Element).setPointerCapture(e.pointerId)
  }
  const onMove = (e: React.PointerEvent) => {
    if (!drag.current) return
    const p = toCanvas(e)
    drag.current.moved = true
    const { id, dx, dy } = drag.current
    setLocalPos((s) => ({ ...s, [id]: { x: Math.max(0, p.x - dx), y: Math.max(0, p.y - dy) } }))
  }
  const onUp = () => {
    const d = drag.current
    drag.current = null
    if (!d) return
    if (!d.moved) return setSelId(d.id)
    if (canEdit) {
      const next = localPos[d.id]
      if (next) {
        mutate((co) => {
          co.layout[d.id] = next
        })
        setLocalPos((s) => {
          const { [d.id]: _omit, ...rest } = s
          return rest
        })
      }
    }
  }

  const setManager = (personId: string, managerId: string) => {
    mutate((co, { audit }) => {
      co.relationships = co.relationships.filter((r) => !(r.from === personId && r.type === 'direct'))
      if (managerId) co.relationships.push({ id: `rel_${personId}_${managerId}`, from: personId, to: managerId, type: 'direct', primary: true })
      audit('Changed reporting line', personId, managerId ? `Now reports to ${co.employees.find((e) => e.id === managerId)?.fullName}` : 'No direct manager')
    })
    toast.success('Reporting line updated', { description: 'Directory, profile and approval routing now use the new manager.' })
  }

  const addVacancy = () => {
    let newId = ''
    mutate((co, { id, audit }) => {
      newId = id('vac')
      const dept = co.departments.find((d) => d.color !== 'exec') ?? co.departments[0]
      co.employees.push({ id: newId, fullName: 'Open role', designation: 'New position', dept: dept?.id ?? '', email: '', status: 'vacancy', location: '—', joined: '', accessRole: 'member' })
      if (dept?.leadId) co.relationships.push({ id: `rel_${newId}`, from: newId, to: dept.leadId, type: 'direct', primary: true })
      audit('Added vacancy', newId, dept?.name ?? '')
    })
    setSelId(newId)
  }

  const deptOptions = c.departments.map((d) => ({ value: d.id, label: d.name }))
  const managerOptions = (p: Employee) =>
    people.filter((x) => x.id !== p.id && x.status !== 'vacancy').map((x) => ({ value: x.id, label: `${x.fullName} — ${x.designation}` }))

  return (
    <div className={cn('flex flex-col overflow-hidden rounded-lg border border-border bg-card lg:flex-row', compact ? 'h-[520px]' : 'h-[calc(100dvh-14rem)] min-h-[560px]')}>
      <div className="relative min-h-80 flex-1 overflow-hidden">
        <div className="absolute left-3 top-3 z-10 flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-md border border-border bg-card shadow-sm">
            <button type="button" className="p-1.5 hover:bg-muted" onClick={() => setZoom((z) => Math.max(0.4, +(z - 0.1).toFixed(2)))} aria-label="Zoom out">
              <Minus className="size-4" />
            </button>
            <span className="w-12 text-center font-mono text-xs">{Math.round(zoom * 100)}%</span>
            <button type="button" className="p-1.5 hover:bg-muted" onClick={() => setZoom((z) => Math.min(1.6, +(z + 0.1).toFixed(2)))} aria-label="Zoom in">
              <Plus className="size-4" />
            </button>
          </div>
          {(Object.keys(relLabel) as RelType[]).map((t) => (
            <label key={t} className="flex items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1 text-xs shadow-sm">
              <input type="checkbox" checked={showTypes[t]} onChange={(e) => setShowTypes((s) => ({ ...s, [t]: e.target.checked }))} />
              <svg width="18" height="6" aria-hidden>
                <line x1="0" y1="3" x2="18" y2="3" stroke={relStyle[t].stroke} strokeWidth="2" strokeDasharray={relStyle[t].dash} />
              </svg>
              {relLabel[t]}
            </label>
          ))}
          {canEdit && (
            <>
              <Button size="sm" variant="outline" className="bg-card" onClick={addVacancy}>
                <UserPlus /> Add position
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="bg-card"
                onClick={() => {
                  mutate((co) => {
                    co.layout = {}
                  })
                  setLocalPos({})
                }}
              >
                <RotateCcw /> Auto-arrange
              </Button>
            </>
          )}
        </div>
        <div className="h-full overflow-auto bg-muted/40 [background-image:radial-gradient(var(--border)_1px,transparent_1px)] [background-size:20px_20px]">
          <svg
            ref={svgRef}
            width={maxX * zoom}
            height={(maxY + 60) * zoom}
            onPointerMove={onMove}
            onPointerUp={onUp}
            role="group"
            aria-label="Organization canvas. Use the list view for a keyboard-friendly alternative."
            className="touch-none select-none"
          >
            <g transform={`scale(${zoom}) translate(0 40)`}>
              {rels.map((r) => {
                const a = posOf(r.from)
                const b = posOf(r.to)
                const x1 = a.x + CARD_W / 2
                const y1 = a.y
                const x2 = b.x + CARD_W / 2
                const y2 = b.y + CARD_H
                const mid = (y1 + y2) / 2
                const on = selId && (r.from === selId || r.to === selId)
                return (
                  <path
                    key={r.id}
                    d={`M${x1},${y1} C${x1},${mid} ${x2},${mid} ${x2},${y2}`}
                    fill="none"
                    stroke={relStyle[r.type].stroke}
                    strokeDasharray={relStyle[r.type].dash}
                    strokeWidth={on ? 2.5 : 1.25}
                    opacity={selId && !on ? 0.15 : 0.7}
                  />
                )
              })}
              {people.map((p) => {
                const pos = posOf(p.id)
                const d = c.departments.find((x) => x.id === p.dept)
                const vac = p.status === 'vacancy'
                const active = p.id === selId
                return (
                  <foreignObject key={p.id} x={pos.x} y={pos.y} width={CARD_W} height={CARD_H}>
                    <button
                      type="button"
                      onPointerDown={(e) => onDown(e, p.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          setSelId(p.id)
                        }
                      }}
                      aria-pressed={active}
                      aria-label={`${p.fullName}, ${p.designation}${vac ? ', vacancy' : ''}`}
                      className={cn(
                        'flex h-full w-full cursor-grab items-center gap-2 rounded-md border bg-card px-2.5 text-left shadow-sm active:cursor-grabbing',
                        vac ? 'border-dashed border-muted-foreground/50 bg-muted' : 'border-border',
                        active && 'ring-2 ring-ring',
                        p.status === 'invited' && 'border-warning',
                      )}
                    >
                      <span aria-hidden className={cn('h-9 w-1 shrink-0 rounded-full', d ? deptColorCls[d.color].bg : 'bg-muted')} />
                      <span className="flex min-w-0 flex-col">
                        <span className={cn('truncate text-[13px] font-medium', vac ? 'italic text-muted-foreground' : 'text-foreground')}>{p.fullName}</span>
                        <span className="truncate text-[11px] text-muted-foreground">
                          {p.designation}
                          {p.status === 'invited' && ' · invited'}
                        </span>
                      </span>
                    </button>
                  </foreignObject>
                )
              })}
            </g>
          </svg>
        </div>
      </div>

      <aside aria-label="Selected person" className="flex w-full shrink-0 flex-col gap-4 overflow-y-auto border-t border-border p-4 lg:w-80 lg:border-l lg:border-t-0">
        {sel ? (
          <SelectedPanel key={sel.id} p={sel} canEdit={canEdit} deptOptions={deptOptions} managerOptions={managerOptions(sel)} onSetManager={setManager} onFocus={setSelId} />
        ) : (
          <p className="text-sm leading-relaxed text-muted-foreground">
            Select a card to see and edit reporting lines. Drag cards to arrange the chart — moving a card never changes who reports to whom.
            {!canEdit && ' Your arrangement is temporary; only administrators save the company layout.'}
          </p>
        )}
      </aside>
    </div>
  )
}

function SelectedPanel({
  p,
  canEdit,
  deptOptions,
  managerOptions,
  onSetManager,
  onFocus,
}: {
  p: Employee
  canEdit: boolean
  deptOptions: { value: string; label: string }[]
  managerOptions: { value: string; label: string }[]
  onSetManager: (id: string, mgr: string) => void
  onFocus: (id: string) => void
}) {
  const { company: c, mutate } = useHub()
  const rels = c.relationships.filter((r) => r.from === p.id || r.to === p.id)
  const mgr = managerOf(c, p.id) ?? ''
  const vac = p.status === 'vacancy'
  const [title, setTitle] = useState(p.designation)

  return (
    <>
      <div className="flex flex-col gap-0.5">
        <h2 className="text-base font-semibold text-foreground">{p.fullName}</h2>
        <p className="text-sm text-muted-foreground">{p.designation}</p>
      </div>

      {canEdit && (
        <div className="flex flex-col gap-3">
          {vac && (
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium">Position title</span>
              <input
                className="h-9 rounded-md border border-input bg-card px-3 text-sm"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() =>
                  title.trim() &&
                  mutate((co) => {
                    const e = co.employees.find((x) => x.id === p.id)
                    if (e) e.designation = title.trim()
                  })
                }
              />
            </label>
          )}
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium">Department</span>
            <Select
              options={deptOptions}
              value={p.dept}
              onChange={(e) =>
                mutate((co, { audit }) => {
                  const emp = co.employees.find((x) => x.id === p.id)
                  if (emp) emp.dept = e.target.value
                  audit('Moved department', p.id, co.departments.find((d) => d.id === e.target.value)?.name ?? '')
                })
              }
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium">Reports to (direct manager)</span>
            <Select options={managerOptions} value={mgr} placeholder="No direct manager" onChange={(e) => onSetManager(p.id, e.target.value)} />
          </label>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Relationships</h3>
        <ul className="flex flex-col gap-1.5">
          {rels.length === 0 && <li className="text-sm text-muted-foreground">No relationships yet.</li>}
          {rels.slice(0, 14).map((r) => {
            const out = r.from === p.id
            const other = c.employees.find((e) => e.id === (out ? r.to : r.from))
            return (
              <li key={r.id} className="flex flex-col gap-0.5 rounded-md border border-border px-2.5 py-2">
                <span className="flex items-center gap-2 text-xs font-medium text-foreground">
                  <svg width="18" height="6" aria-hidden>
                    <line x1="0" y1="3" x2="18" y2="3" stroke={relStyle[r.type].stroke} strokeWidth="2" strokeDasharray={relStyle[r.type].dash} />
                  </svg>
                  {out ? relLabel[r.type] : r.type === 'direct' ? 'Manages' : `${relLabel[r.type]} for`}
                </span>
                <button type="button" className="text-left text-sm text-foreground hover:underline" onClick={() => other && onFocus(other.id)}>
                  {other?.fullName}
                </button>
                {r.context && <span className="text-xs text-muted-foreground">{r.context}</span>}
              </li>
            )
          })}
        </ul>
      </div>

      <div className="mt-auto flex flex-col gap-2">
        {vac && canEdit && (
          <Link href={`/employees?invite=1&position=${p.id}`} className="text-center text-sm font-medium text-info hover:underline">
            Invite someone into this position
          </Link>
        )}
        {!vac && (
          <Link href={`/employees/${p.id}`} className="text-center text-sm font-medium text-info hover:underline">
            Open full profile
          </Link>
        )}
      </div>
    </>
  )
}
