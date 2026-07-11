import { createFileRoute } from "@tanstack/react-router";
import TambahProdukPage from "@/pages/produk/tambah";

export const Route = createFileRoute("/produk/tambah")({
  component: TambahProdukPage,
});
