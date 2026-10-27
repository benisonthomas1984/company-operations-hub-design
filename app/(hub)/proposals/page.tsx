import { Page } from '@/components/hub/page'
import { Proposals } from '@/components/company/proposals'

export default function ProposalsPage() {
  return (
    <Page viewId="V10" title="Proposals" description="New product and service ideas. Board approval requires every member; approved proposals become projects." features={['CO10', 'CO07', 'CO20']} sourceName="Proposal service" emptyTitle="No proposals yet" emptyBody="Anyone can draft a proposal. Drafts stay private until submitted.">
      <Proposals />
    </Page>
  )
}
