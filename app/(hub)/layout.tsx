import { Suspense } from 'react'
import { AppShell } from '@/components/shell/app-shell'

export default function HubLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      <Suspense>{children}</Suspense>
    </AppShell>
  )
}
