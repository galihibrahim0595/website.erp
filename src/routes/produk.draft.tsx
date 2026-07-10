import { createFileRoute } from "@tanstack/react-router";
import { ProductsPage } from "@/components/products/ProductsPage";
export const Route = createFileRoute("/produk/draft")({
  head: () => ({ meta: [{ title: "Produk Draft — NovaOMS" }] }),
  component: () => <ProductsPage title="Produk Draft" statusFilter="draft" />,
});
