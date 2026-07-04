import ProductsStatusPage from "../status-page";

export default function LowStockProductsPage() {
  return (
    <ProductsStatusPage
      title="Bajo stock"
      description="Productos con 5 unidades o menos disponibles."
      filter="low-stock"
    />
  );
}