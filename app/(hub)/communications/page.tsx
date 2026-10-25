import { Page } from '@/components/hub/page'
import { Communications } from '@/components/communications/communications'

export default function CommunicationsPage() {
  return (
    <Page viewId="V14" title="Communications" description="Context-linked conversations, meetings, files and recorded decisions." features={['CO14', 'CO13']} sourceName="Messaging service">
      <Communications />
    </Page>
  )
}
