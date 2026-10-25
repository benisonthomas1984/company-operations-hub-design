import { AppStoreProvider } from '@/lib/store'
import { AppShell } from '@/components/shell/app-shell'

export default function HubLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppStoreProvider>
      <AppShell>{children}</AppShell>
    </AppStoreProvider>
  )
}
