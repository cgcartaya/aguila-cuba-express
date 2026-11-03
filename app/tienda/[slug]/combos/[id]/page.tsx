import ComboDetailClient from "./ComboDetailClient";
export { generateComboMetadata as generateMetadata } from "@/lib/storefront/combo-metadata";
export const revalidate = 1800;
export default function Page() { return <ComboDetailClient />; }
