import ProductsStatusPage from "../status-page";

export default function InactiveProductsPage() {
  return (
    <ProductsStatusPage
      title="Productos inactivos"
      description="Productos ocultos de la tienda pública."
      filter="inactive"
    />
  );
}