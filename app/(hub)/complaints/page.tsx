import { Page } from '@/components/hub/page'
import { Complaints } from '@/components/complaints/complaints'

export default function ComplaintsPage() {
  return (
    <Page viewId="V08" title="Complaints" description="Private, restricted cases handled by the complaint committee." features={['CO08', 'CO07']} sourceName="Case service">
      <Complaints />
    </Page>
  )
}
