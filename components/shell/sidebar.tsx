'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useStore } from '@/lib/store'
import { groupLabels, navItems, type NavItem } from './nav'

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  const { can, approvals, perspective } = useStore()

  const pendingForMe = approvals.filter(
    (r) => (!r.restricted || can('complaints.case')) && r.stages.some((s) => s.decisions.some((d) => d.personId === perspective.id && d.decision === 'pending')),
  ).length

  const visible = navItems.filter((i) => !i.requires || can(i.requires))
  const groups = (Object.keys(groupLabels) as NavItem['group'][]).map((g) => ({ g, items: visible.filter((i) => i.group === g) })).filter((x) => x.items.length)

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    if (href === '/communications') return pathname === '/communications'
    if (href === '/settings') return pathname === '/settings'
    return pathname === href || pathname.startsWith(href + '/')
  }

  return (
    <nav aria-label="Primary" className="flex flex-col gap-4 px-2 py-3">
      {groups.map(({ g, items }) => (
        <div key={g} className="flex flex-col gap-0.5">
          <p className="px-2 pb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{groupLabels[g]}</p>
          {items.map((item) => {
            const locked = item.lockedWithout && !can(item.lockedWithout)
            const active = isActive(item.href)
            const label = item.href === '/complaints' && !can('complaints.case') ? 'Submit Complaint' : item.label
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent',
                  active && 'bg-sidebar-accent font-medium text-sidebar-accent-foreground',
                )}
              >
                <item.icon aria-hidden className={cn('size-4 shrink-0', active ? 'text-foreground' : 'text-muted-foreground')} />
                <span className="flex-1 truncate">{label}</span>
                {item.href === '/approvals' && pendingForMe > 0 && (
                  <span className="rounded-full bg-primary px-1.5 font-mono text-[10px] text-primary-foreground" aria-label={`${pendingForMe} pending`}>
                    {pendingForMe}
                  </span>
                )}
                {locked && <Lock aria-label="Restricted" className="size-3 text-muted-foreground" />}
              </Link>
            )
          })}
        </div>
      ))}
    </nav>
  )
}
