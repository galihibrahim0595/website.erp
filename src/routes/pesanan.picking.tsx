import { createFileRoute } from "@tanstack/react-router";
import { OrdersPage } from "@/components/orders/OrdersPage";
export const Route = createFileRoute("/pesanan/picking")({
  head: () => ({ meta: [{ title: "Sedang Picking — NovaOMS" }] }),
  component: () => <OrdersPage status="picking" title="Sedang Picking" />,
});
