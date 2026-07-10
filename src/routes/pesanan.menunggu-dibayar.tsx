import { createFileRoute } from "@tanstack/react-router";
import { OrdersPage } from "@/components/orders/OrdersPage";
export const Route = createFileRoute("/pesanan/menunggu-dibayar")({
  head: () => ({ meta: [{ title: "Menunggu Dibayar — NovaOMS" }] }),
  component: () => <OrdersPage status="waiting_payment" title="Menunggu Dibayar" />,
});
