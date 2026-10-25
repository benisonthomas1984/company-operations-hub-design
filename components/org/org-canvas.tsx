'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronRight, Maximize2, Minus, Plus, RotateCcw, Save, Search, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { departments, employees, relationships, relLabel, type DeptId, type Employee, type Relationship, type RelType } from '@/lib/fixtures'
import { useStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { Avatar, DeptTag, StatusPill } from '@/components/hub/primitives'

const CW = 184
const CH = 56
const GAP = 12
const PAD = 16
const HEAD = 30
const COL_W = CW * 2 + GAP + PAD * 2
const COL_GAP = 36
const TOP_Y = 40
const DEPT_Y = 220

type Pos = Record<string, { x: number; y: number }>

function buildPeople(scale: boolean): { people: Employee[]; rels: Relationship[] } {
  if (!scale) return { people: employees, rels: relationships }
  const extra: Employee[] = []
  const extraRels: Relationship[] = []
  const per = 47
  departments
    .filter((d) => d.isDepartment)
    .forEach((d) => {
      for (let i = 1; i <= per; i++) {
        const id = `gen_${d.id}_${i}`
        extra.push({ id, name: `${d.name} ${i}`, fullName: `${d.name} Member ${String(i).padStart(2, '0')}`, designation: 'Team member (scale fixture)', dept: d.id, email: '', status: 'active', location: '—', joined: '—', responsibilities: [] })
        extraRels.push({ id: `rel_${id}`, from: id, to: d.leadId, type: 'direct', primary: true })
      }
    })
  return { people: [...employees, ...extra], rels: [...relationships, ...extraRels] }
}

function initialLayout(people: Employee[]): Pos {
  const pos: Pos = {}
  const depts = departments.filter((d) => d.isDepartment)
  const totalW = depts.length * COL_W + (depts.length - 1) * COL_GAP
  const execX = totalW / 2 - (CW * 2 + GAP) / 2
  pos.maya = { x: execX, y: TOP_Y + HEAD }
  pos.ravi = { x: execX + CW + GAP, y: TOP_Y + HEAD }
  depts.forEach((d, i) => {
    const colX = i * (COL_W + COL_GAP) + PAD
    const lead = d.leadId
    pos[lead] = { x: colX + (CW + GAP) / 2, y: DEPT_Y + HEAD }
    const members = people.filter((e) => e.dept === d.id && e.id !== lead)
    members.forEach((m, j) => {
      pos[m.id] = { x: colX + (j % 2) * (CW + GAP), y: DEPT_Y + HEAD + (CH + GAP) * (1 + Math.floor(j / 2)) + 8 }
    })
  })
  return pos
}

const relStyle: Record<RelType, { stroke: string; dash?: string; width: number }> = {
  direct: { stroke: 'var(--muted-foreground)', width: 1.25 },
  project: { stroke: 'var(--info)', dash: '6 4', width: 1.5 },
  functional: { stroke: 'var(--warning)', dash: '2 4', width: 1.5 },
}

export function OrgCanvas() {
  const { can } = useStore()
  const canEditRelationships = can('org.edit')
  const [scaleFixture, setScaleFixture] = useState(false)
  const { people, rels } = useMemo(() => buildPeople(scaleFixture), [scaleFixture])
  const [pos, setPos] = useState<Pos>(() => initialLayout(employees))
  const [dirty, setDirty] = useState(false)
  const [zoom, setZoom] = useState(0.85)
  const [collapsed, setCollapsed] = useState<DeptId[]>([])
  const [types, setTypes] = useState<RelType[]>(['direct', 'project', 'functional'])
  const [selected, setSelected] = useState<string | null>('ana')
  const [query, setQuery] = useState('')
  const [view, setView] = useState({ left: 0, top: 0, w: 1, h: 1 })
  const scroller = useRef<HTMLDivElement>(null)
  const drag = useRef<{ id: string; sx: number; sy: number; ox: number; oy: number; moved: boolean } | null>(null)

  useEffect(() => {
    setPos(initialLayout(people))
    if (scaleFixture) {
      setCollapsed(['mkt', 'sup', 'hr', 'fin'])
      setZoom(0.55)
    } else {
      setCollapsed([])
    }
  }, [people, scaleFixture])

  const hiddenIds = useMemo(() => {
    const set = new Set<string>()
    people.forEach((p) => {
      const d = departments.find((x) => x.id === p.dept)
      if (d && collapsed.includes(d.id) && p.id !== d.leadId) set.add(p.id)
    })
    return set
  }, [people, collapsed])

  const visiblePeople = people.filter((p) => !hiddenIds.has(p.id) && pos[p.id])

  const containers = useMemo(() => {
    return departments.map((d) => {
      const members = visiblePeople.filter((p) => p.dept === d.id)
      if (!members.length) return null
      const xs = members.map((m) => pos[m.id].x)
      const ys = members.map((m) => pos[m.id].y)
      const x = Math.min(...xs) - PAD
      const y = Math.min(...ys) - HEAD
      const w = Math.max(...xs) + CW + PAD - x
      const h = Math.max(...ys) + CH + PAD - y
      const total = people.filter((p) => p.dept === d.id).length
      return { d, x, y, w: Math.max(w, CW + PAD * 2), h, total }
    }).filter(Boolean) as { d: (typeof departments)[number]; x: number; y: number; w: number; h: number; total: number }[]
  }, [visiblePeople, pos, people])

  const bounds = useMemo(() => {
    const maxX = Math.max(...containers.map((c) => c.x + c.w), 800) + 60
    const maxY = Math.max(...containers.map((c) => c.y + c.h), 600) + 60
    return { w: maxX, h: maxY }
  }, [containers])

  const lines = rels.filter((r) => types.includes(r.type) && !hiddenIds.has(r.from) && !hiddenIds.has(r.to) && pos[r.from] && pos[r.to])

  const onPointerDown = (e: React.PointerEvent, id: string) => {
    if (e.button !== 0) return
    ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
    drag.current = { id, sx: e.clientX, sy: e.clientY, ox: pos[id].x, oy: pos[id].y, moved: false }
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d) return
    const dx = (e.clientX - d.sx) / zoom
    const dy = (e.clientY - d.sy) / zoom
    if (Math.abs(dx) + Math.abs(dy) > 3) d.moved = true
    if (d.moved) {
      setPos((p) => ({ ...p, [d.id]: { x: Math.max(0, d.ox + dx), y: Math.max(0, d.oy + dy) } }))
      setDirty(true)
    }
  }
  const onPointerUp = () => {
    const d = drag.current
    drag.current = null
    if (d && !d.moved) setSelected(d.id)
  }

  const nudge = (id: string, dx: number, dy: number) => {
    setPos((p) => ({ ...p, [id]: { x: Math.max(0, p[id].x + dx), y: Math.max(0, p[id].y + dy) } }))
    setDirty(true)
  }

  const focusPerson = useCallback(
    (id: string) => {
      const p = people.find((x) => x.id === id)
      if (!p) return
      setCollapsed((c) => c.filter((x) => x !== p.dept))
      setSelected(id)
      requestAnimationFrame(() => {
        const el = scroller.current
        const pp = pos[id]
        if (el && pp) el.scrollTo({ left: pp.x * zoom - el.clientWidth / 2 + (CW * zoom) / 2, top: pp.y * zoom - el.clientHeight / 2, behavior: 'smooth' })
        document.getElementById(`card-${id}`)?.focus({ preventScroll: true })
      })
    },
    [people, pos, zoom],
  )

  const matches = query.trim() ? people.filter((p) => p.fullName.toLowerCase().includes(query.toLowerCase()) || p.designation.toLowerCase().includes(query.toLowerCase())).slice(0, 6) : []

  const onScroll = () => {
    const el = scroller.current
    if (el) setView({ left: el.scrollLeft / zoom, top: el.scrollTop / zoom, w: el.clientWidth / zoom, h: el.clientHeight / zoom })
  }
  useEffect(onScroll, [zoom])

  const sel = selected ? people.find((p) => p.id === selected) : null
  const selRels = sel ? rels.filter((r) => r.from === sel.id || r.to === sel.id) : []
  const mmScale = 200 / bounds.w

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search aria-hidden className="absolute left-2.5 top-2 size-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing && e.keyCode !== 229 && matches[0]) {
                focusPerson(matches[0].id)
                setQuery('')
              }
            }}
            placeholder="Find a person on the canvas"
            aria-label="Find a person on the canvas"
            className="h-8 w-full rounded-md border border-input bg-card pl-8 pr-2 text-sm outline-none focus:border-ring"
          />
          {matches.length > 0 && (
            <ul className="absolute z-20 mt-1 w-full rounded-md border border-border bg-popover p-1 shadow-md">
              {matches.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-accent"
                    onClick={() => {
                      focusPerson(m.id)
                      setQuery('')
                    }}
                  >
                    <Avatar id={m.id} size="sm" />
                    <span className="truncate">{m.fullName}</span>
                    <span className="ml-auto truncate text-xs text-muted-foreground">{m.designation}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <fieldset className="flex items-center gap-1 rounded-md border border-border bg-card p-0.5">
          <legend className="sr-only">Relationship types</legend>
          {(Object.keys(relLabel) as RelType[]).map((t) => {
            const on = types.includes(t)
            return (
              <button
                key={t}
                type="button"
                aria-pressed={on}
                onClick={() => setTypes((x) => (on ? x.filter((y) => y !== t) : [...x, t]))}
                className={cn('flex items-center gap-1.5 rounded px-2 py-1 text-xs', on ? 'bg-accent text-foreground' : 'text-muted-foreground')}
              >
                <svg width="22" height="6" aria-hidden>
                  <line x1="0" y1="3" x2="22" y2="3" stroke={relStyle[t].stroke} strokeWidth="2" strokeDasharray={relStyle[t].dash} />
                </svg>
                {relLabel[t]}
              </button>
            )
          })}
        </fieldset>

        <div className="flex items-center gap-1 rounded-md border border-border bg-card p-0.5">
          <Button variant="ghost" size="icon-sm" aria-label="Zoom out" onClick={() => setZoom((z) => Math.max(0.35, +(z - 0.1).toFixed(2)))}>
            <Minus />
          </Button>
          <span className="w-10 text-center font-mono text-xs" aria-live="polite">
            {Math.round(zoom * 100)}%
          </span>
          <Button variant="ghost" size="icon-sm" aria-label="Zoom in" onClick={() => setZoom((z) => Math.min(1.5, +(z + 0.1).toFixed(2)))}>
            <Plus />
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label="Fit to screen" onClick={() => scroller.current && setZoom(Math.max(0.35, Math.min(1.2, scroller.current.clientWidth / bounds.w)))}>
            <Maximize2 />
          </Button>
        </div>

        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <input type="checkbox" checked={scaleFixture} onChange={(e) => setScaleFixture(e.target.checked)} />
          250-employee scale fixture
        </label>

        <div className="ml-auto flex items-center gap-2">
          {dirty && <span className="text-xs text-warning">Unsaved layout</span>}
          <Button
            variant="outline"
            size="sm"
            disabled={!dirty}
            onClick={() => {
              setPos(initialLayout(people))
              setDirty(false)
            }}
          >
            <RotateCcw /> Reset
          </Button>
          <Button
            size="sm"
            disabled={!dirty}
            onClick={() => {
              setDirty(false)
              toast.success('Layout saved', { description: 'Card positions saved as layout v2. Reporting relationships are unchanged.' })
            }}
          >
            <Save /> Save layout
          </Button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-3 xl:grid-cols-[1fr_300px]">
        <div className="relative min-h-[560px] overflow-hidden rounded-lg border border-border bg-canvas">
          <div ref={scroller} onScroll={onScroll} className="canvas-grid absolute inset-0 overflow-auto" onPointerMove={onPointerMove} onPointerUp={onPointerUp}>
            <div style={{ width: bounds.w * zoom, height: bounds.h * zoom }} className="relative">
              <div style={{ transform: `scale(${zoom})`, transformOrigin: '0 0', width: bounds.w, height: bounds.h }} className="absolute left-0 top-0">
                {containers.map(({ d, x, y, w, h, total }) => {
                  const isCollapsed = collapsed.includes(d.id)
                  return (
                    <div key={d.id} style={{ left: x, top: y, width: w, height: h }} className={cn('absolute rounded-lg border bg-card/70', d.borderClass)}>
                      <div className="flex h-7 items-center gap-1.5 px-2">
                        <button
                          type="button"
                          aria-expanded={!isCollapsed}
                          aria-label={`${isCollapsed ? 'Expand' : 'Collapse'} ${d.name}`}
                          onClick={() => setCollapsed((c) => (isCollapsed ? c.filter((x) => x !== d.id) : [...c, d.id]))}
                          className="rounded p-0.5 hover:bg-muted"
                          disabled={!d.isDepartment}
                        >
                          {isCollapsed ? <ChevronRight className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                        </button>
                        <span aria-hidden className={cn('size-2 rounded-[2px]', d.bgClass)} />
                        <span className={cn('text-xs font-semibold', d.colorClass)}>{d.name}</span>
                        <span className="text-[11px] text-muted-foreground">
                          {total} {total === 1 ? 'person' : 'people'}
                          {isCollapsed && ` · ${total - 1} hidden`}
                        </span>
                      </div>
                    </div>
                  )
                })}

                <svg width={bounds.w} height={bounds.h} className="pointer-events-none absolute left-0 top-0" aria-hidden>
                  {lines.map((r) => {
                    const a = pos[r.from]
                    const b = pos[r.to]
                    const x1 = a.x + CW / 2
                    const y1 = a.y
                    const x2 = b.x + CW / 2
                    const y2 = b.y + CH
                    const hl = selected && (r.from === selected || r.to === selected)
                    const st = relStyle[r.type]
                    const midY = y2 + (y1 - y2) / 2
                    const path = r.type === 'direct' && y1 > y2 ? `M${x1},${y1} V${midY} H${x2} V${y2}` : `M${x1},${y1} C${x1},${y1 - 60} ${x2},${y2 + 60} ${x2},${y2}`
                    return <path key={r.id} d={path} fill="none" stroke={hl ? 'var(--foreground)' : st.stroke} strokeWidth={hl ? st.width + 1 : st.width} strokeDasharray={st.dash} opacity={selected && !hl ? 0.35 : 0.9} />
                  })}
                </svg>

                {visiblePeople.map((p) => {
                  const pp = pos[p.id]
                  const isSel = selected === p.id
                  return (
                    <button
                      key={p.id}
                      id={`card-${p.id}`}
                      type="button"
                      style={{ left: pp.x, top: pp.y, width: CW, height: CH }}
                      onPointerDown={(e) => onPointerDown(e, p.id)}
                      onKeyDown={(e) => {
                        if (e.altKey && e.key.startsWith('Arrow')) {
                          e.preventDefault()
                          const step = 12
                          nudge(p.id, e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0, e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0)
                        } else if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          setSelected(p.id)
                        }
                      }}
                      aria-label={`${p.fullName}, ${p.designation}. Press Enter for relationships; Alt+Arrow keys to move.`}
                      aria-pressed={isSel}
                      className={cn(
                        'absolute flex cursor-grab touch-none items-center gap-2 rounded-md border bg-card px-2 text-left shadow-xs select-none active:cursor-grabbing',
                        isSel ? 'border-foreground ring-2 ring-ring/40' : 'border-border hover:border-ring',
                        p.status === 'vacancy' && 'border-dashed bg-transparent',
                        p.status === 'inactive' && 'opacity-60',
                      )}
                    >
                      <Avatar id={p.id} size="sm" />
                      <span className="flex min-w-0 flex-col leading-tight">
                        <span className="truncate text-xs font-medium text-foreground">{p.status === 'vacancy' ? 'Vacancy' : p.fullName}</span>
                        <span className="truncate text-[11px] text-muted-foreground">{p.designation}</span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="absolute bottom-3 left-3 rounded-md border border-border bg-card/95 p-1.5 shadow-sm" aria-hidden>
            <svg width={200} height={bounds.h * mmScale} className="block cursor-pointer" onClick={(e) => {
              const r = (e.currentTarget as SVGElement).getBoundingClientRect()
              const x = (e.clientX - r.left) / mmScale
              const y = (e.clientY - r.top) / mmScale
              scroller.current?.scrollTo({ left: x * zoom - (scroller.current.clientWidth / 2), top: y * zoom - (scroller.current.clientHeight / 2), behavior: 'smooth' })
            }}>
              {containers.map((c) => (
                <rect key={c.d.id} x={c.x * mmScale} y={c.y * mmScale} width={c.w * mmScale} height={c.h * mmScale} rx={2} className={c.d.colorClass} fill="currentColor" opacity={0.25} />
              ))}
              <rect x={view.left * mmScale} y={view.top * mmScale} width={view.w * mmScale} height={view.h * mmScale} fill="none" stroke="var(--foreground)" strokeWidth={1} />
            </svg>
          </div>
        </div>

        <aside className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4" aria-label="Relationship details">
          {sel ? (
            <>
              <div className="flex items-start gap-3">
                <Avatar id={sel.id} size="lg" />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <h2 className="truncate text-base font-semibold text-foreground">{sel.status === 'vacancy' ? 'Vacancy' : sel.fullName}</h2>
                  <p className="text-sm text-muted-foreground">{sel.designation}</p>
                  <DeptTag id={sel.dept} />
                </div>
                <button type="button" onClick={() => setSelected(null)} aria-label="Close details" className="rounded p-1 hover:bg-muted">
                  <X className="size-4" />
                </button>
              </div>
              {sel.status !== 'active' && <StatusPill status={sel.status === 'vacancy' ? 'Vacancy — open position' : 'Inactive'} />}
              <div className="flex flex-col gap-2">
                <h3 className="text-xs font-medium text-muted-foreground">Relationships ({selRels.length})</h3>
                <ul className="flex flex-col gap-1.5">
                  {selRels.slice(0, 12).map((r) => {
                    const outgoing = r.from === sel.id
                    const other = people.find((p) => p.id === (outgoing ? r.to : r.from))
                    return (
                      <li key={r.id} className="flex flex-col gap-0.5 rounded-md border border-border px-2.5 py-2">
                        <div className="flex items-center gap-2">
                          <svg width="18" height="6" aria-hidden>
                            <line x1="0" y1="3" x2="18" y2="3" stroke={relStyle[r.type].stroke} strokeWidth="2" strokeDasharray={relStyle[r.type].dash} />
                          </svg>
                          <span className="text-xs font-medium text-foreground">
                            {outgoing ? `${relLabel[r.type]}:` : relLabel[r.type] === 'Direct manager' ? 'Manages' : `${relLabel[r.type]} for`}
                          </span>
                          {r.primary && outgoing && <span className="rounded-sm bg-muted px-1 text-[10px] text-muted-foreground">Primary</span>}
                        </div>
                        <button type="button" className="text-left text-sm text-foreground hover:underline" onClick={() => other && focusPerson(other.id)}>
                          {other?.fullName}
                        </button>
                        {r.context && <span className="text-xs text-muted-foreground">{r.context}</span>}
                      </li>
                    )
                  })}
                  {selRels.length > 12 && <li className="text-xs text-muted-foreground">+{selRels.length - 12} more in list view</li>}
                </ul>
              </div>
              <div className="mt-auto flex flex-col gap-2">
                {canEditRelationships ? (
                  <Button variant="outline" size="sm" onClick={() => toast('Relationship editor', { description: 'Add or change typed relationships. Changes are versioned and do not move cards.' })}>
                    Edit relationships
                  </Button>
                ) : (
                  <p className="text-xs leading-relaxed text-muted-foreground">You can rearrange cards for your own layout. Relationship changes require org-edit permission.</p>
                )}
                {sel.status !== 'vacancy' && !sel.id.startsWith('gen_') && (
                  <Link href={`/employees/${sel.id}`} className="text-center text-sm font-medium text-info hover:underline">
                    Open full profile
                  </Link>
                )}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Select a card to see typed relationships. Moving a card never changes who reports to whom.</p>
          )}
        </aside>
      </div>
    </div>
  )
}
