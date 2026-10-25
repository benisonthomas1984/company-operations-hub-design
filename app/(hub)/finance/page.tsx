import { Suspense } from 'react'
import { Finance } from '@/components/finance/finance'

export default function FinancePage() {
  return (
    <Suspense>
      <Finance />
    </Suspense>
  )
}
