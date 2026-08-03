import ProductDetailClient from "./ProductDetailClient";

/*
 * ISR: la página se cachea 30 min. El contenido real lo sigue
 * cargando ProductDetailClient en el navegador (igual que antes),
 * esto solo evita que Vercel ejecute una función nueva en cada
 * visita para servir el mismo HTML base.
 */
export const revalidate = 1800;
export const dynamicParams = true;

type PageProps = {
  params: Promise<{
    slug: string;
    id: string;
  }>;
};

export default async function ProductDetailPage({ params }: PageProps) {
  const { slug, id } = await params;

  return <ProductDetailClient slug={slug} id={id} />;
}
