import { createFileRoute } from "@tanstack/react-router";
import { MarketplacePage } from "@/components/marketplace/MarketplacePage";
export const Route = createFileRoute("/marketplace/shopee")({
  head: () => ({ meta: [{ title: "Shopee — NovaOMS" }] }),
  component: () => <MarketplacePage name="Shopee" mp="shopee" brandColor="bg-orange-500" />,
});
