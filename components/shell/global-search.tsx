'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, Search } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { useHub } from '@/lib/store'
import { canAccessContext, canSeeActivity, canSeeAnnouncement, contextInfo } from '@/lib/derive'

type Hit = { id: string; label: string; kind: string; href: string }

export function GlobalSearch() {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)
  const router = useRouter()
  const { company: c, me, can, priv } = useHub()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const index = useMemo<Hit[]>(() => {
    const manage = can('manage')
    const ctxOk = (key: string) => {
      const [type, id] = key.split(':') as ['project' | 'department' | 'product', string]
      return canAccessContext(c, me, { type, id })
    }
    const hits: Hit[] = [
      ...c.employees.filter((e) => e.status !== 'vacancy').map((e) => ({ id: e.id, label: `${e.fullName} — ${e.designation}`, kind: 'Employee', href: `/employees/${e.id}` })),
      ...c.departments.map((d) => ({ id: d.id, label: d.name, kind: 'Department', href: `/departments/${d.id}` })),
      ...c.activities.filter((a) => canSeeActivity(c, me, a)).map((a) => ({ id: a.id, label: `${a.id} ${a.title}`, kind: 'Activity', href: `/activities?id=${a.id}` })),
      ...c.projects.map((p) => ({ id: p.id, label: `${p.id} ${p.name}`, kind: 'Project', href: `/projects/${p.id}` })),
      ...c.proposals.filter((p) => p.status !== 'Draft' || p.authorId === me.id).map((p) => ({ id: p.id, label: `${p.id} ${p.title}`, kind: 'Proposal', href: `/proposals/${p.id}` })),
      ...c.backlog.map((b) => ({ id: b.id, label: `${b.id} ${b.title}`, kind: 'Backlog item', href: `/backlog/${b.id}` })),
      ...c.releases.map((r) => ({ id: r.id, label: `${c.products.find((p) => p.id === r.productId)?.name ?? ''} ${r.name}`, kind: 'Release', href: `/backlog/releases/${r.id}` })),
      ...c.products.map((b) => ({ id: b.id, label: b.name, kind: b.kind, href: `/products/${b.id}` })),
      ...c.files.filter((f) => ctxOk(f.ctx)).map((f) => ({ id: f.id, label: `${f.name} · ${contextInfo(c, f.ctx).label}`, kind: 'File', href: `${contextInfo(c, f.ctx).href}?tab=files` })),
      ...c.decisions.filter((d) => ctxOk(d.ctx)).map((d) => ({ id: d.id, label: `${d.id} ${d.title}`, kind: 'Decision', href: `${contextInfo(c, d.ctx).href}?tab=decisions` })),
      ...c.announcements.filter((a) => canSeeAnnouncement(a, me, manage) && (a.status === 'Published' || manage || a.senderId === me.id)).map((a) => ({ id: a.id, label: a.title, kind: 'Announcement', href: `/communications/announcements?id=${a.id}` })),
    ]
    if (can('finance.read')) hits.push(...c.expenses.map((e) => ({ id: e.id, label: `${e.id} ${e.description}`, kind: 'Expense', href: `/finance?tab=expenses&id=${e.id}` })))
    if (!priv.mailDisconnected) hits.push(...(c.mailboxes[me.id] ?? []).map((m) => ({ id: m.id, label: m.subject, kind: 'My Mail (private)', href: `/mail?m=${m.id}` })))
    if (can('complaints.case')) hits.push(...c.complaints.map((x) => ({ id: x.id, label: `${x.id} ${x.category}`, kind: 'Complaint case', href: `/complaints?case=${x.id}` })))
    return hits
  }, [c, me, can, priv.mailDisconnected])

  const results = q.trim() ? index.filter((h) => h.label.toLowerCase().includes(q.toLowerCase())).slice(0, 14) : index.slice(0, 8)

  const go = (h: Hit) => {
    setOpen(false)
    setQ('')
    router.push(h.href)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-8 w-full max-w-sm items-center gap-2 rounded-md border border-input bg-background px-2.5 text-sm text-muted-foreground hover:border-ring"
      >
        <Search aria-hidden className="size-4" />
        <span className="flex-1 truncate text-left">Search {c.name}…</span>
        <kbd className="hidden rounded border border-border bg-muted px-1 font-mono text-[10px] sm:inline">⌘K</kbd>
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="gap-0 p-0 sm:max-w-xl" showCloseButton={false}>
          <DialogTitle className="sr-only">Global search</DialogTitle>
          <DialogDescription className="sr-only">Search records you are authorized to see in the current company.</DialogDescription>
          <div className="flex items-center gap-2 border-b border-border px-3">
            <Search aria-hidden className="size-4 text-muted-foreground" />
            <input
              autoFocus
              value={q}
              onChange={(e) => {
                setQ(e.target.value)
                setActive(0)
              }}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') setActive((a) => Math.min(a + 1, results.length - 1))
                if (e.key === 'ArrowUp') setActive((a) => Math.max(a - 1, 0))
                if (e.key === 'Enter' && !e.nativeEvent.isComposing && e.keyCode !== 229 && results[active]) go(results[active])
              }}
              placeholder="People, activities, projects, proposals, files…"
              aria-label="Search"
              role="combobox"
              aria-expanded
              aria-controls="search-results"
              className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <ul id="search-results" role="listbox" className="max-h-80 overflow-y-auto p-1">
            {results.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted-foreground">No authorized results in this company.</li>}
            {results.map((h, i) => (
              <li key={h.kind + h.id} role="option" aria-selected={i === active}>
                <button
                  type="button"
                  onClick={() => go(h)}
                  onMouseEnter={() => setActive(i)}
                  className={`flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-sm ${i === active ? 'bg-accent' : ''}`}
                >
                  <span className="truncate text-foreground">{h.label}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{h.kind}</span>
                </button>
              </li>
            ))}
          </ul>
          <p className="flex items-center gap-1.5 border-t border-border px-3 py-2 text-[11px] text-muted-foreground">
            <Lock aria-hidden className="size-3" />
            Results are filtered by company and permission. Other people&apos;s mail and complaint cases are never searchable.
          </p>
        </DialogContent>
      </Dialog>
    </>
  )
}
