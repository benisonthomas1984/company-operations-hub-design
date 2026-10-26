'use client'

import { useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Minus, Network, Plus, Trash2, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useHub } from '@/lib/store'
import { deptColorCls, relLabel, type CompanyData, type Employee, type RelType } from '@/lib/fixtures'
import { CARD_H, CARD_W, assignToPosition, descendants, directManager, isRemovable, placed, positionLabel, removePosition, setDirectManager, treeLayout } from '@/lib/org-ops'
import { Select, TextInput } from '@/components/hub/form'
import { cn } from '@/lib/utils'

const relStyle: Record<RelType, { stroke: string; dash?: string }> = {
  direct: { stroke: 'var(--foreground)' },
  project: { stroke: 'var(--info)', dash: '6 4' },
  functional: { stroke: 'var(--muted-foreground)', dash: '2 4' },
}

export const defaultLayout = treeLayout

export function OrgCanvas({ compact = false }: { compact?: boolean }) {
  const { company: c, can, mutate } = useHub()
  const canEdit = can('org.edit')
  const [zoom, setZoom] = useState(compact ? 0.8 : 0.9)
  const [selId, setSelId] = useState<string | null>(null)
  const [showTypes, setShowTypes] = useState<Record<RelType, boolean>>({ direct: true, project: true, functional: true })
  const [localPos, setLocalPos] = useState<Record<string, { x: number; y: number }>>({})
  const drag = useRef<{ id: string; dx: number; dy: number; moved: boolean } | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const people = placed(c)
  const base = useMemo(() => treeLayout(c), [c])
  const posOf = (id: string) => localPos[id] ?? c.layout[id] ?? base[id] ?? { x: 0, y: 0 }
  const maxX = Math.max(900, ...people.map((p) => posOf(p.id).x + CARD_W + 40))
  const maxY = Math.max(420, ...people.map((p) => posOf(p.id).y + CARD_H + 60))
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
    const next = localPos[d.id]
    if (canEdit && next) {
      mutate((co) => void (co.layout[d.id] = next))
      setLocalPos(({ [d.id]: _omit, ...rest }) => rest)
    }
  }

  const autoArrange = () => {
    mutate((co) => {
      co.layout = treeLayout(co)
    })
    setLocalPos({})
    toast.success('Chart arranged by reporting line')
  }

  const addPosition = () => {
    let newId = ''
    mutate((co, { id, audit, me }) => {
      newId = id('vac')
      const parent = (selId && co.employees.find((e) => e.id === selId)) || co.employees.find((e) => e.accessRole === 'owner') || me
      const dept = parent?.dept || co.departments[0]?.id || ''
      co.employees.push({ id: newId, fullName: 'Open position', designation: 'New position', dept, email: '', status: 'vacancy', location: '—', joined: '', accessRole: 'member' })
      if (parent) setDirectManager(co, newId, parent.id)
      const hasManual = Object.keys(co.layout).length > 0
      if (hasManual && parent) {
        const pp = co.layout[parent.id] ?? treeLayout(co)[parent.id]
        const siblings = co.relationships.filter((r) => r.type === 'direct' && r.to === parent.id).length
        if (pp) co.layout[newId] = { x: pp.x + (siblings - 1) * (CARD_W + 24), y: pp.y + 120 }
      }
      audit('Added position', newId, parent ? `Reports to ${parent.designation}` : '')
    })
    setSelId(newId)
  }

  return (
    <div className={cn('flex flex-col overflow-hidden rounded-lg border border-border bg-card', compact ? 'h-[600px]' : 'h-[calc(100dvh-14rem)] min-h-[560px]')}>
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
        <div className="flex items-center rounded-md border border-border bg-card">
          <button type="button" className="p-1.5 hover:bg-muted" onClick={() => setZoom((z) => Math.max(0.4, +(z - 0.1).toFixed(2)))} aria-label="Zoom out">
            <Minus className="size-4" />
          </button>
          <span className="w-12 text-center font-mono text-xs">{Math.round(zoom * 100)}%</span>
          <button type="button" className="p-1.5 hover:bg-muted" onClick={() => setZoom((z) => Math.min(1.6, +(z + 0.1).toFixed(2)))} aria-label="Zoom in">
            <Plus className="size-4" />
          </button>
        </div>
        {(Object.keys(relLabel) as RelType[]).map((t) => (
          <label key={t} className="flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs">
            <input type="checkbox" checked={showTypes[t]} onChange={(e) => setShowTypes((s) => ({ ...s, [t]: e.target.checked }))} />
            <svg width="18" height="6" aria-hidden>
              <line x1="0" y1="3" x2="18" y2="3" stroke={relStyle[t].stroke} strokeWidth="2" strokeDasharray={relStyle[t].dash} />
            </svg>
            {relLabel[t]}
          </label>
        ))}
        {canEdit && (
          <div className="ml-auto flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={autoArrange}>
              <Network /> Auto-arrange
            </Button>
            <Button size="sm" onClick={addPosition}>
              <UserPlus /> {sel ? `Add position under ${sel.designation}` : 'Add position'}
            </Button>
          </div>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="min-h-72 flex-1 overflow-auto bg-muted/40 [background-image:radial-gradient(var(--border)_1px,transparent_1px)] [background-size:20px_20px]" onClick={(e) => e.target === e.currentTarget && setSelId(null)}>
          <svg
            ref={svgRef}
            width={maxX * zoom}
            height={maxY * zoom}
            onPointerMove={onMove}
            onPointerUp={onUp}
            role="group"
            aria-label="Organization canvas. Use the list view for a keyboard-friendly alternative."
            className="touch-none select-none"
          >
            <g transform={`scale(${zoom})`}>
              {rels.map((r) => {
                const a = posOf(r.from)
                const b = posOf(r.to)
                const x1 = a.x + CARD_W / 2
                const x2 = b.x + CARD_W / 2
                const y2 = b.y + CARD_H
                const mid = (a.y + y2) / 2
                const on = selId && (r.from === selId || r.to === selId)
                return (
                  <path
                    key={r.id}
                    d={`M${x1},${a.y} C${x1},${mid} ${x2},${mid} ${x2},${y2}`}
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
                      aria-pressed={p.id === selId}
                      aria-label={`${p.designation}, ${vac ? 'open position' : p.fullName}`}
                      className={cn(
                        'flex h-full w-full cursor-grab items-center gap-2 rounded-md border bg-card px-2.5 text-left shadow-sm active:cursor-grabbing',
                        vac ? 'border-dashed border-muted-foreground/50 bg-muted' : 'border-border',
                        p.id === selId && 'ring-2 ring-ring',
                        p.status === 'invited' && 'border-warning',
                      )}
                    >
                      <span aria-hidden className={cn('h-9 w-1 shrink-0 rounded-full', d ? deptColorCls[d.color].bg : 'bg-muted')} />
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate text-[13px] font-medium text-foreground">{p.designation}</span>
                        <span className={cn('truncate text-[11px]', vac ? 'italic text-muted-foreground' : 'text-muted-foreground')}>
                          {vac ? 'Open — unassigned' : p.fullName}
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

        <aside aria-label="Selected position" className="flex w-full shrink-0 flex-col gap-4 overflow-y-auto border-t border-border p-4 lg:w-80 lg:border-l lg:border-t-0">
          {sel ? (
            <SelectedPanel key={sel.id} p={sel} canEdit={canEdit} onFocus={setSelId} />
          ) : (
            <p className="text-sm leading-relaxed text-muted-foreground">
              Select a position to edit its title, who holds it and which position it reports to. Select a position and use Add position to create a role under it.
              {!canEdit && ' Your arrangement is temporary; only administrators save the company layout.'}
            </p>
          )}
        </aside>
      </div>
    </div>
  )
}

function positionOptions(c: CompanyData, p: Employee) {
  const below = descendants(c, p.id)
  return placed(c)
    .filter((x) => x.id !== p.id && !below.has(x.id))
    .map((x) => ({ value: x.id, label: positionLabel(x) }))
}

function SelectedPanel({ p, canEdit, onFocus }: { p: Employee; canEdit: boolean; onFocus: (id: string | null) => void }) {
  const { company: c, mutate } = useHub()
  const rels = c.relationships.filter((r) => r.from === p.id || r.to === p.id)
  const mgr = directManager(c, p.id) ?? ''
  const vac = p.status === 'vacancy'
  const [title, setTitle] = useState(p.designation)
  const [name, setName] = useState(vac ? '' : p.fullName)
  const [confirmRemove, setConfirmRemove] = useState(false)
  const editableName = vac || (!p.email && p.accessRole !== 'owner')
  const candidates = c.employees.filter((e) => e.id !== p.id && (e.status === 'active' || e.status === 'invited'))

  const update = (fn: (e: Employee) => void, action: string, detail = '') =>
    mutate((co, { audit }) => {
      const e = co.employees.find((x) => x.id === p.id)
      if (e) fn(e)
      audit(action, p.id, detail)
    })

  const saveName = () => {
    const n = name.trim()
    if (!n || n === p.fullName) return
    update(
      (e) => {
        e.fullName = n
        if (e.status === 'vacancy') e.status = 'active'
      },
      'Named position holder',
      n,
    )
    toast.success(`${n} now holds ${p.designation}`, { description: 'Add their email later from Employees to send an invitation.' })
  }

  return (
    <>
      <div className="flex flex-col gap-0.5">
        <h2 className="text-base font-semibold text-foreground">{p.designation}</h2>
        <p className="text-sm text-muted-foreground">{vac ? 'Open position' : p.fullName}</p>
      </div>

      {canEdit && (
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium">Position title</span>
            <TextInput value={title} onChange={(e) => setTitle(e.target.value)} onBlur={() => title.trim() && title.trim() !== p.designation && update((e) => void (e.designation = title.trim()), 'Renamed position', title.trim())} />
          </label>

          {editableName && (
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium">Person in this position (optional)</span>
              <div className="flex gap-2">
                <TextInput placeholder="Type a name" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), saveName())} />
                <Button type="button" variant="outline" size="sm" className="h-9" disabled={!name.trim() || name.trim() === p.fullName} onClick={saveName}>
                  Save
                </Button>
              </div>
            </label>
          )}

          {vac && candidates.length > 0 && (
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium">Or assign an existing employee</span>
              <Select
                placeholder="Choose employee"
                value=""
                options={candidates.map((e) => ({ value: e.id, label: `${e.fullName} — ${e.designation}` }))}
                onChange={(e) => {
                  const pid = e.target.value
                  if (!pid) return
                  const who = c.employees.find((x) => x.id === pid)
                  mutate((co, { audit }) => {
                    assignToPosition(co, pid, p.id)
                    audit('Assigned to position', pid, p.designation)
                  })
                  toast.success(`${who?.fullName} moved into ${p.designation}`)
                  onFocus(pid)
                }}
              />
            </label>
          )}

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium">Department</span>
            <Select
              options={c.departments.map((d) => ({ value: d.id, label: d.name }))}
              value={p.dept}
              onChange={(e) => update((emp) => void (emp.dept = e.target.value), 'Moved department', c.departments.find((d) => d.id === e.target.value)?.name)}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium">Reports to (position)</span>
            <Select
              options={positionOptions(c, p)}
              value={mgr}
              placeholder="Top of the organization"
              onChange={(e) => {
                const to = e.target.value
                mutate((co, { audit }) => {
                  setDirectManager(co, p.id, to)
                  audit('Changed reporting line', p.id, to ? `Reports to ${co.employees.find((x) => x.id === to)?.designation}` : 'Top level')
                })
                toast.success('Reporting line updated', { description: 'Use Auto-arrange to redraw the chart.' })
              }}
            />
            <span className="text-xs leading-relaxed text-muted-foreground">Reporting follows the position, so it stays in place when the person changes.</span>
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
                  {other ? positionLabel(other) : '—'}
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
            Invite someone by email into this position
          </Link>
        )}
        {!vac && p.email && (
          <Link href={`/employees/${p.id}`} className="text-center text-sm font-medium text-info hover:underline">
            Open full profile
          </Link>
        )}
        {canEdit && isRemovable(p) && (
          <Button
            type="button"
            variant={confirmRemove ? 'destructive' : 'outline'}
            onClick={() => {
              if (!confirmRemove) return setConfirmRemove(true)
              mutate((co, { audit }) => {
                removePosition(co, p.id)
                audit('Removed position', p.id, p.designation)
              })
              toast.success(`${p.designation} removed`, { description: 'Anyone reporting to it now reports one level up.' })
              onFocus(null)
            }}
          >
            <Trash2 /> {confirmRemove ? 'Click again to remove' : 'Remove position'}
          </Button>
        )}
      </div>
    </>
  )
}
