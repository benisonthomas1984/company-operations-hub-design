import { Page } from '@/components/hub/page'
import { Integrations } from '@/components/settings/integrations'

export default function IntegrationsPage() {
  return (
    <Page viewId="V19" title="Subscription & Integrations" description="Plan, AI credit pool and data connectors with freshness." features={['CO19']} sourceName="Platform">
      <Integrations />
    </Page>
  )
}
