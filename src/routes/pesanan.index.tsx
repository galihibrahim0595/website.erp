import { createFileRoute } from "@tanstack/react-router";
import { OrdersPage } from "@/components/orders/OrdersPage";
export const Route = createFileRoute("/pesanan/")({
  head: () => ({ meta: [{ title: "Semua Pesanan — NovaOMS" }] }),
  component: () => <OrdersPage status="all" title="Semua Pesanan" />,
});
