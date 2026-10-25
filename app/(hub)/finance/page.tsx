import { Suspense } from 'react'
import { Page } from '@/components/hub/page'
import { Finance } from '@/components/finance/finance'

export default function FinancePage() {
  return (
    <Page viewId="V16" title="Finance" description="Company expense, allocations and product contribution. Contribution is not profit." features={['CO16', 'CO17']} sourceName="Finance service">
      <Suspense>
        <Finance />
      </Suspense>
    </Page>
  )
}
