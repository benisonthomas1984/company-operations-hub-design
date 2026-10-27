'use client'

import type { ReactNode } from 'react'
import { useHub } from '@/lib/store'
import { StateBlock } from '@/components/hub/page'

export function AdminGate({ children }: { children: ReactNode }) {
  const { can } = useHub()
  if (!can('settings')) return <StateBlock title="Administrators only" body="This area requires the company owner or an administrator. No settings are shown." />
  return <>{children}</>
}
