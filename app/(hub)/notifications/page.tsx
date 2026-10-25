import { Page } from '@/components/hub/page'
import { Notifications } from '@/components/personal/notifications'

export default function NotificationsPage() {
  return (
    <Page viewId="V20" title="Notifications" description="Everything that needs your attention, scoped to what you can see." features={['CO20']} sourceName="Notification service">
      <Notifications />
    </Page>
  )
}
