import { Page } from '@/components/hub/page'
import { Productivity } from '@/components/personal/productivity'

export default function ProductivityPage() {
  return (
    <Page viewId="V17" title="My Productivity" description="Private, factual view of your own delivery. Not a score." features={['CO04']} sourceName="Activity service">
      <Productivity />
    </Page>
  )
}
