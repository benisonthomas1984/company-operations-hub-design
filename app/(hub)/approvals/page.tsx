import { Suspense } from 'react'
import { Page } from '@/components/hub/page'
import { Approvals } from '@/components/approvals/approvals'

export default function ApprovalsPage() {
  return (
    <Page
      viewId="V07"
      title="My Approvals"
      description="Every required approver must decide. Decisions bind to a specific revision and round."
      features={['CO07', 'CO08']}
      sourceName="Approval service"
      emptyTitle="No approvals"
      emptyBody="Items appear here when a workflow names you as an approver."
    >
      <Suspense>
        <Approvals />
      </Suspense>
    </Page>
  )
}
