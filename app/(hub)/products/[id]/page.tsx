import { ProductDetailPage } from '@/components/company/products'

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <ProductDetailPage id={id} />
}
