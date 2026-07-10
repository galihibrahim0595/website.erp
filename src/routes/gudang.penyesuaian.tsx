import { createFileRoute } from "@tanstack/react-router";
import { MovementsPage } from "@/components/warehouse/MovementsPage";
export const Route = createFileRoute("/gudang/penyesuaian")({
  head: () => ({ meta: [{ title: "Penyesuaian Stock — NovaOMS" }] }),
  component: () => <MovementsPage title="Penyesuaian Stock" subtitle="Adjustment koreksi stock" type="adjustment" ctaLabel="Tambah Penyesuaian" />,
});
