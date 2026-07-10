import { createFileRoute } from "@tanstack/react-router";
import { OrdersPage } from "@/components/orders/OrdersPage";
export const Route = createFileRoute("/pesanan/selesai")({
  head: () => ({ meta: [{ title: "Selesai — NovaOMS" }] }),
  component: () => <OrdersPage status="completed" title="Selesai" />,
});
