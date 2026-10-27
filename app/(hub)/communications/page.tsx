import { Suspense } from 'react'
import { Communications } from '@/components/communications/communications'

export default function CommunicationsPage() {
  return (
    <Suspense>
      <Communications />
    </Suspense>
  )
}
