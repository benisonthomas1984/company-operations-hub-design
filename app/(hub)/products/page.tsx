import { Page } from '@/components/hub/page'
import { ProductList } from '@/components/company/products'

export default function ProductsPage() {
  return (
    <Page viewId="V11" title="Products & Services" description="Business products and services sold by Comet Works — distinct from the platform subscription." features={['CO11', 'CO16']} sourceName="Catalog service">
      <ProductList />
    </Page>
  )
}
