import { createFileRoute } from "@tanstack/react-router";
import { ProductsPage } from "@/components/products/ProductsPage";
export const Route = createFileRoute("/produk/aktif")({
  head: () => ({ meta: [{ title: "Produk Aktif — NovaOMS" }] }),
  component: () => <ProductsPage title="Produk Aktif" statusFilter="active" />,
});
