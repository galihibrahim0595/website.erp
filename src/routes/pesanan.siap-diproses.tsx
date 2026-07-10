import { createFileRoute } from "@tanstack/react-router";
import { OrdersPage } from "@/components/orders/OrdersPage";
export const Route = createFileRoute("/pesanan/siap-diproses")({
  head: () => ({ meta: [{ title: "Siap Diproses — NovaOMS" }] }),
  component: () => <OrdersPage status="ready_to_process" title="Siap Diproses" />,
});
