'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Bell, Coins, LogOut, Mail, Menu, UserRound } from 'lucide-react'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useStore } from '@/lib/store'
import { accessRoleLabel } from '@/lib/fixtures'
import { noticesFor } from '@/lib/derive'
import { SidebarNav } from './sidebar'
import { GlobalSearch } from './global-search'
import { SampleDataButton } from './sample-data-button'
import { LanguageSwitcher } from './language-switcher'
import { Avatar } from '@/components/hub/primitives'
import { cn } from '@/lib/utils'

export function Brand({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn('flex items-center gap-2', className)}>
      <span aria-hidden className="flex size-7 items-center justify-center rounded-md bg-primary font-mono text-xs font-semibold text-primary-foreground">
        OH
      </span>
      <span className="text-sm font-semibold text-foreground">Operations Hub</span>
    </Link>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const store = useStore()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const { ready, company, me } = store

  useEffect(() => {
    if (!ready) return
    if (!company || !me) router.replace('/login')
    else if (!company.onboarding.done && me.accessRole === 'owner') router.replace('/onboarding')
  }, [ready, company, me, router])

  if (!ready || !company || !me || (!company.onboarding.done && me.accessRole === 'owner')) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background text-sm text-muted-foreground" aria-busy="true">
        Loading workspace…
      </div>
    )
  }

  const notices = noticesFor(company, me, store.can('complaints.case'))
  const unread = notices.filter((n) => !store.priv.readNotifications.includes(n.id)).length
  const creditsLeft = company.credits.limit - company.credits.used

  const logout = () => {
    store.logout()
    router.replace('/login')
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
        <Brand className="px-3 py-3.5" />
        <div className="flex-1 overflow-y-auto">
          <SidebarNav />
        </div>
        <div className="border-t border-sidebar-border px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">Prototype · synthetic data · simulated integrations</div>
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 bg-sidebar p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <Brand className="px-3 py-3.5" />
          <div className="overflow-y-auto">
            <SidebarNav onNavigate={() => setMobileOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center gap-3 border-b border-border bg-card px-3 md:px-4">
          <button type="button" className="rounded-md p-1.5 hover:bg-muted lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation">
            <Menu className="size-5" />
          </button>
          <span className="hidden max-w-48 truncate text-sm font-semibold text-foreground sm:inline" title="Current company">
            {company.name}
          </span>
          <div className="flex flex-1 justify-center">
            <GlobalSearch />
          </div>
          <SampleDataButton />
          <LanguageSwitcher />
          <Link
            href={store.can('settings') ? '/settings/subscription' : '/dossier'}
            className="hidden items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-muted md:flex"
            aria-label={`${creditsLeft.toLocaleString('en')} AI credits remaining`}
          >
            <Coins aria-hidden className="size-3.5" />
            <span className="font-mono text-foreground">{creditsLeft.toLocaleString('en')}</span> credits
          </Link>
          <Link href="/notifications" className="relative rounded-md p-1.5 hover:bg-muted" aria-label={`Notifications, ${unread} unread`}>
            <Bell className="size-5 text-muted-foreground" />
            {unread > 0 && (
              <span className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-destructive px-1 text-center font-mono text-[10px] leading-4 text-primary-foreground" aria-hidden>
                {unread}
              </span>
            )}
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 rounded-md px-1 py-1 hover:bg-muted" aria-label="Account menu">
              <Avatar id={me.id} />
              <span className="hidden flex-col text-left leading-tight md:flex">
                <span className="text-sm font-medium text-foreground">{me.fullName}</span>
                <span className="text-[11px] text-muted-foreground">{me.designation}</span>
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              <DropdownMenuGroup>
                <DropdownMenuLabel className="flex flex-col gap-0.5">
                  <span className="text-sm text-foreground">{me.fullName}</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {me.email} · {accessRoleLabel[me.accessRole]}
                  </span>
                </DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push(`/employees/${me.id}`)}>
                <UserRound /> My profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/mail')}>
                <Mail /> My Mail
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout}>
                <LogOut /> Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        {/* relative: absolutely-positioned descendants (e.g. sr-only labels) must stay inside this scroller, not stretch the document */}
        <main className="relative flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}
