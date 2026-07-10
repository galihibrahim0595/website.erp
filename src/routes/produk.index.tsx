import { createFileRoute } from "@tanstack/react-router";
import { ProductsPage } from "@/components/products/ProductsPage";

export const Route = createFileRoute("/produk/")({
  head: () => ({ meta: [{ title: "Semua Produk — NovaOMS" }] }),
  component: () => <ProductsPage title="Semua Produk" />,
});
