import { createFileRoute } from "@tanstack/react-router";
import { ProductsPage } from "@/components/products/ProductsPage";
export const Route = createFileRoute("/produk/nonaktif")({
  head: () => ({ meta: [{ title: "Produk Nonaktif — NovaOMS" }] }),
  component: () => <ProductsPage title="Produk Nonaktif" statusFilter="inactive" />,
});
