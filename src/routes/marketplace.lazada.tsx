import { createFileRoute } from "@tanstack/react-router";
import { MarketplacePage } from "@/components/marketplace/MarketplacePage";
export const Route = createFileRoute("/marketplace/lazada")({
  head: () => ({ meta: [{ title: "Lazada — NovaOMS" }] }),
  component: () => <MarketplacePage name="Lazada" mp="lazada" brandColor="bg-blue-600" />,
});
