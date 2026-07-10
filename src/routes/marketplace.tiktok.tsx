import { createFileRoute } from "@tanstack/react-router";
import { MarketplacePage } from "@/components/marketplace/MarketplacePage";
export const Route = createFileRoute("/marketplace/tiktok")({
  head: () => ({ meta: [{ title: "TikTok Shop — NovaOMS" }] }),
  component: () => <MarketplacePage name="TikTok Shop" mp="tiktok" brandColor="bg-neutral-900" />,
});
