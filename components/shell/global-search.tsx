'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock, Search } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { useStore } from '@/lib/store'
import { anaMail, backlog, businessProducts, documents, employees, projects, proposals, initialActivities, departments } from '@/lib/fixtures'

type Hit = { id: string; label: string; kind: string; href: string }

export function GlobalSearch() {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)
  const router = useRouter()
  const { perspective, can, companyId } = useStore()

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
    if (companyId !== 'co_comet_works') return []
    const hits: Hit[] = [
      ...employees.filter((e) => e.status !== 'vacancy').map((e) => ({ id: e.id, label: `${e.fullName} — ${e.designation}`, kind: 'Employee', href: `/employees/${e.id}` })),
      ...departments.filter((d) => d.isDepartment).map((d) => ({ id: d.id, label: d.name, kind: 'Department', href: `/departments/${d.id}` })),
      ...initialActivities.map((a) => ({ id: a.id, label: `${a.id} ${a.title}`, kind: 'Activity', href: `/activities?id=${a.id}` })),
      ...projects.map((p) => ({ id: p.id, label: `${p.id} ${p.name}`, kind: 'Project', href: `/projects/${p.id}` })),
      ...proposals.map((p) => ({ id: p.id, label: `${p.id} ${p.title}`, kind: 'Proposal', href: `/proposals?id=${p.id}` })),
      ...backlog.map((b) => ({ id: b.id, label: `${b.id} ${b.title}`, kind: 'Backlog item', href: `/backlog?id=${b.id}` })),
      ...businessProducts.map((b) => ({ id: b.business_product_service_id, label: b.name, kind: 'Product / service', href: `/products/${b.business_product_service_id}` })),
      ...documents.map((d) => ({ id: d.id, label: `${d.id} ${d.name}`, kind: 'Document', href: '/communications?tab=documents' })),
    ]
    // Private mailbox: only the connected owner (Ana in fixtures) can ever search it.
    if (perspective.id === 'ana') {
      hits.push(...anaMail.map((m) => ({ id: m.id, label: m.subject, kind: 'My Mail (private)', href: `/mail?m=${m.id}` })))
    }
    if (can('complaints.case')) hits.push({ id: 'CMP-0107', label: 'CMP-0107 Restricted complaint case', kind: 'Complaint case', href: '/complaints?case=CMP-0107' })
    return hits
  }, [perspective, can, companyId])

  const results = q.trim() ? index.filter((h) => h.label.toLowerCase().includes(q.toLowerCase())).slice(0, 12) : index.slice(0, 8)

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
        <span className="flex-1 truncate text-left">Search Comet Works…</span>
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
              placeholder="People, activities, projects, proposals, documents…"
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
            Results are filtered by company and permissions before retrieval. Other employees&apos; mail and complaint cases are never indexed for you.
          </p>
        </DialogContent>
      </Dialog>
    </>
  )
}
