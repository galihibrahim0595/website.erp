import { createFileRoute } from "@tanstack/react-router";
import { MarketplacePage } from "@/components/marketplace/MarketplacePage";
export const Route = createFileRoute("/marketplace/tokopedia")({
  head: () => ({ meta: [{ title: "Tokopedia — NovaOMS" }] }),
  component: () => <MarketplacePage name="Tokopedia" mp="tokopedia" brandColor="bg-green-600" />,
});
