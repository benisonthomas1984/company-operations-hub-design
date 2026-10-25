'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Bell, Eye, Menu } from 'lucide-react'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { useStore, perspectives, type PerspectiveId } from '@/lib/store'
import { companies, employees, notifications } from '@/lib/fixtures'
import { SidebarNav } from './sidebar'
import { GlobalSearch } from './global-search'
import { Avatar } from '@/components/hub/primitives'

export function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { perspective, setPerspective, companyId, setCompanyId } = useStore()
  const unread = notifications.filter((n) => n.for.includes('*') || n.for.includes(perspective.id)).length
  const company = companies.find((c) => c.id === companyId)!

  const brand = (
    <div className="flex items-center gap-2 px-3 py-3">
      <span aria-hidden className="flex size-7 items-center justify-center rounded-md bg-primary font-mono text-xs font-semibold text-primary-foreground">
        OH
      </span>
      <div className="flex flex-col leading-tight">
        <span className="text-sm font-semibold text-foreground">Operations Hub</span>
        <span className="text-[11px] text-muted-foreground">Provisional name</span>
      </div>
    </div>
  )

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        {brand}
        <div className="flex-1 overflow-y-auto">
          <SidebarNav />
        </div>
        <div className="border-t border-sidebar-border px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
          Design prototype · synthetic Comet Works fixtures · no live integrations
        </div>
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 bg-sidebar p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          {brand}
          <div className="overflow-y-auto">
            <SidebarNav onNavigate={() => setMobileOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-2 border-b border-border bg-muted/60 px-4 py-1.5 text-xs text-muted-foreground">
          <Eye aria-hidden className="size-3.5 shrink-0" />
          <span className="hidden sm:inline">Review perspective (design testing only — not an impersonation privilege):</span>
          <label className="sr-only" htmlFor="perspective">
            Review perspective
          </label>
          <select
            id="perspective"
            value={perspective.id}
            onChange={(e) => setPerspective(e.target.value as PerspectiveId)}
            className="h-6 rounded border border-input bg-card px-1 text-xs text-foreground"
          >
            {perspectives.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label} — {p.role}
              </option>
            ))}
          </select>
        </div>
        <header className="flex h-14 items-center gap-3 border-b border-border bg-card px-4">
          <button type="button" className="rounded-md p-1.5 hover:bg-muted lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation">
            <Menu className="size-5" />
          </button>
          <label className="sr-only" htmlFor="company">
            Current company
          </label>
          <select
            id="company"
            value={companyId}
            onChange={(e) => setCompanyId(e.target.value)}
            className="h-8 max-w-44 rounded-md border border-input bg-background px-2 text-sm font-medium text-foreground"
          >
            {companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <span className="hidden font-mono text-[11px] text-muted-foreground xl:inline">{company.product_account_id}</span>
          <div className="flex flex-1 justify-center">
            <GlobalSearch />
          </div>
          <Link href="/notifications" className="relative rounded-md p-1.5 hover:bg-muted" aria-label={`Notifications, ${unread} unread`}>
            <Bell className="size-5 text-muted-foreground" />
            {unread > 0 && <span className="absolute right-0.5 top-0.5 size-2 rounded-full bg-destructive" aria-hidden />}
          </Link>
          <Link href={`/employees/${perspective.id}`} className="flex items-center gap-2 rounded-md px-1 py-1 hover:bg-muted">
            <Avatar id={perspective.id} />
            <span className="hidden flex-col leading-tight md:flex">
              <span className="text-sm font-medium text-foreground">{perspective.label}</span>
              <span className="text-[11px] text-muted-foreground">{employees.find((e) => e.id === perspective.id)?.designation}</span>
            </span>
          </Link>
        </header>
        <main className="flex-1 overflow-y-auto">{companyId === 'co_comet_works' ? children : <TenantBoundary />}</main>
      </div>
    </div>
  )
}

function TenantBoundary() {
  const labs = [
    { name: 'Ana Rossi', role: 'Designer' },
    { name: 'Noor Malik', role: 'Operations Manager' },
    { name: 'Sam Ito', role: 'Founder' },
  ]
  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex flex-col gap-1">
        <p className="font-mono text-[11px] text-muted-foreground">AT01 · CO14.01 · CO14.02</p>
        <h1 className="text-xl font-semibold text-foreground">Comet Labs workspace</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          A separate customer company (product_account_id pa_2Q9M_COMETLABS). Employees with similar names exist, but no Comet Works record, search hit, AI answer,
          file or export is visible here. Switch back to Comet Works to continue the walkthrough.
        </p>
      </div>
      <div className="rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <caption className="sr-only">Comet Labs employees</caption>
          <thead className="border-b border-border text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">Employee</th>
              <th className="px-4 py-2 font-medium">Designation</th>
              <th className="px-4 py-2 font-medium">Company</th>
            </tr>
          </thead>
          <tbody>
            {labs.map((p) => (
              <tr key={p.name} className="border-b border-border last:border-0">
                <td className="px-4 py-2 text-foreground">{p.name}</td>
                <td className="px-4 py-2 text-muted-foreground">{p.role}</td>
                <td className="px-4 py-2 text-muted-foreground">Comet Labs</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
