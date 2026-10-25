import { Page } from '@/components/hub/page'
import { AccessSettings } from '@/components/settings/access'

export default function SettingsPage() {
  return (
    <Page viewId="V18" title="Access & Settings" description="Who can do what, and an append-only record of every change." features={['CO18']} sourceName="Access service">
      <AccessSettings />
    </Page>
  )
}
