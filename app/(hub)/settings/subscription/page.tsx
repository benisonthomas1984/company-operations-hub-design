import { Page } from '@/components/hub/page'
import { Subscription } from '@/components/settings/integrations'

export default function SubscriptionPage() {
  return (
    <Page viewId="V19" title="Subscription & Credits" description="Your plan, seats and the shared AI credit pool." features={['CO19']} sourceName="Platform">
      <Subscription />
    </Page>
  )
}
