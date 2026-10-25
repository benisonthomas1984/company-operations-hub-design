import { Suspense } from 'react'
import { Page } from '@/components/hub/page'
import { ApprovalsWorkspace } from '@/components/approvals/approvals'

export default function ApprovalsPage() {
  return (
    <Page title="My Approvals" description="Every required approver must decide. Decisions bind to a specific revision and round.">
      <Suspense>
        <ApprovalsWorkspace />
      </Suspense>
    </Page>
  )
}
