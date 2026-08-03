import CategoryClient from "./CategoryClient";

export const revalidate = 1800;
export const dynamicParams = true;

type PageProps = {
  params: Promise<{
    slug: string;
    category: string;
  }>;
};

export default async function CategoryPage({ params }: PageProps) {
  const { slug, category } = await params;

  return <CategoryClient slug={slug} category={category} />;
}
