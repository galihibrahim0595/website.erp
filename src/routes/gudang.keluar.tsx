import { createFileRoute } from "@tanstack/react-router";
import { MovementsPage } from "@/components/warehouse/MovementsPage";
export const Route = createFileRoute("/gudang/keluar")({
  head: () => ({ meta: [{ title: "Stock Keluar — NovaOMS" }] }),
  component: () => <MovementsPage title="Stock Keluar" subtitle="Pengeluaran barang manual" type="out" ctaLabel="Tambah Stock Keluar" />,
});
