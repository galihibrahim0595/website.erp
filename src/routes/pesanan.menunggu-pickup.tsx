import { createFileRoute } from "@tanstack/react-router";
import { OrdersPage } from "@/components/orders/OrdersPage";
export const Route = createFileRoute("/pesanan/menunggu-pickup")({
  head: () => ({ meta: [{ title: "Menunggu Pickup — NovaOMS" }] }),
  component: () => <OrdersPage status="waiting_pickup" title="Menunggu Pickup" />,
});
