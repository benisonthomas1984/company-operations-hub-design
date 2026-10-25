'use client'

import type { ReactNode } from 'react'
import { useStore } from '@/lib/store'
import { Callout } from '@/components/hub/primitives'

export function AdminGate({ children }: { children: ReactNode }) {
  const { can } = useStore()
  if (!can('settings.manage')) {
    return (
      <Callout tone="muted" title="Administrators only">
        This area needs the settings management permission. Switch to Maya Okafor to review it.
      </Callout>
    )
  }
  return <>{children}</>
}
