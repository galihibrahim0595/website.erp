import { createFileRoute } from "@tanstack/react-router";
import { MovementsPage } from "@/components/warehouse/MovementsPage";
export const Route = createFileRoute("/gudang/transfer")({
  head: () => ({ meta: [{ title: "Transfer Gudang — NovaOMS" }] }),
  component: () => <MovementsPage title="Transfer Gudang" subtitle="Pindah stock antar gudang" type="transfer" ctaLabel="Tambah Transfer" />,
});
