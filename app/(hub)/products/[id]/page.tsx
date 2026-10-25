import { Page } from '@/components/hub/page'
import { ProductDetail } from '@/components/company/products'
import { businessProducts } from '@/lib/fixtures'

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const b = businessProducts.find((x) => x.business_product_service_id === id)
  return (
    <Page viewId="V11" title={b?.name ?? 'Product'} description={b?.summary} features={['CO11', 'CO16']} sourceName="Catalog service">
      <ProductDetail id={id} />
    </Page>
  )
}
