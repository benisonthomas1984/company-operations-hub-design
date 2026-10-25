import { Page } from '@/components/hub/page'
import { Dossier } from '@/components/dossier/dossier'

export default function DossierPage() {
  return (
    <Page
      viewId="V01"
      title="Intelligence Dossier"
      description="Your private, permission-aware workspace for questions about Comet Works. Every answer cites its sources and freshness."
      features={['CO10', 'CO13', 'CO15', 'CO16']}
      sourceName="AI service"
      emptyTitle="No questions yet"
      emptyBody="Pick a suggested prompt or ask about people, activities, approvals, products or finance you can access."
    >
      <Dossier />
    </Page>
  )
}
