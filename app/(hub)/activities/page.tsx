import { Suspense } from 'react'
import { Page } from '@/components/hub/page'
import { ActivitiesWorkspace } from '@/components/activities/activities-workspace'

export default function ActivitiesPage() {
  return (
    <Page
      viewId="V04"
      title="Activities"
      description="One canonical record per activity. Owners submit evidence; reviewers accept or reopen. Revised dates keep the original."
      features={['CO06', 'CO09']}
      sourceName="Activity service"
      emptyTitle="No activities yet"
      emptyBody="Create an activity from a project, backlog item or department."
    >
      <Suspense>
        <ActivitiesWorkspace />
      </Suspense>
    </Page>
  )
}
