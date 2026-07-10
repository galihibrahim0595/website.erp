import { createFileRoute } from "@tanstack/react-router";
import { OrdersPage } from "@/components/orders/OrdersPage";
export const Route = createFileRoute("/pesanan/retur")({
  head: () => ({ meta: [{ title: "Retur — NovaOMS" }] }),
  component: () => <OrdersPage status="returned" title="Retur" />,
});
