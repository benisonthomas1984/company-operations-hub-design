import { Suspense } from 'react'
import { Page } from '@/components/hub/page'
import { Backlog } from '@/components/company/backlog'

export default function BacklogPage() {
  return (
    <Page viewId="V12" title="Backlog & Releases" description="Approved scope grouped by release. Execution needs its own approval before delivery starts." features={['CO11', 'CO07']} sourceName="Backlog service">
      <Suspense>
        <Backlog />
      </Suspense>
    </Page>
  )
}
