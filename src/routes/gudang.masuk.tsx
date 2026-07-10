import { createFileRoute } from "@tanstack/react-router";
import { MovementsPage } from "@/components/warehouse/MovementsPage";
export const Route = createFileRoute("/gudang/masuk")({
  head: () => ({ meta: [{ title: "Stock Masuk — NovaOMS" }] }),
  component: () => <MovementsPage title="Stock Masuk" subtitle="Penerimaan barang ke gudang" type="in" ctaLabel="Tambah Stock Masuk" />,
});
