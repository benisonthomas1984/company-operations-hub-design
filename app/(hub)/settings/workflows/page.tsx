import { Page } from '@/components/hub/page'
import { Workflows } from '@/components/settings/workflows'

export default function WorkflowsPage() {
  return (
    <Page viewId="V06" title="Workflows & Committees" description="Versioned approval committees and the rounds that use them." features={['CO06', 'CO07']} sourceName="Workflow service">
      <Workflows />
    </Page>
  )
}
