import { PageHeader } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, RefreshCw, Store, TrendingUp, Package, ShoppingCart } from "lucide-react";
import { products, orders } from "@/services/data";
import type { Marketplace } from "@/types";
import { formatIDR, formatNumber } from "@/lib/format";

export function MarketplacePage({ name, mp, brandColor }: { name: string; mp: Marketplace; brandColor: string }) {
  const mpProducts = products.filter(p => p.marketplace === mp);
  const mpOrders = orders.filter(o => o.marketplace === mp);
  const totalSales = mpOrders.reduce((s, o) => s + o.total, 0);

  return (
    <div className="p-6 space-y-4">
      <PageHeader
        title={name}
        subtitle="Kelola koneksi, produk, dan pesanan dari marketplace"
        actions={<>
          <Button variant="outline" size="sm"><RefreshCw className="h-3.5 w-3.5" /> Sinkron Sekarang</Button>
          <Button size="sm">Pengaturan Toko</Button>
        </>}
      />

      <Card className="p-6 flex flex-wrap items-center gap-4">
        <div className={`grid h-14 w-14 place-items-center rounded-xl text-white ${brandColor}`}>
          <Store className="h-7 w-7" />
        </div>
        <div className="flex-1 min-w-[200px]">
          <div className="flex items-center gap-2">
            <div className="font-bold text-lg">{name}</div>
            <Badge className="bg-success/15 text-success border-success/30"><CheckCircle2 className="h-3 w-3 mr-1" /> Terhubung</Badge>
          </div>
          <div className="text-xs text-muted-foreground mt-1">Terakhir sinkron 5 menit lalu · 2 toko aktif</div>
        </div>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Produk", value: formatNumber(mpProducts.length), icon: Package, cls: "text-primary bg-primary/10" },
          { label: "Total Pesanan", value: formatNumber(mpOrders.length), icon: ShoppingCart, cls: "text-info bg-info/10" },
          { label: "Total Penjualan", value: formatIDR(totalSales), icon: TrendingUp, cls: "text-success bg-success/10" },
          { label: "Rating Toko", value: "4.9 / 5", icon: Store, cls: "text-warning bg-warning/10" },
        ].map(s => (
          <Card key={s.label} className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs uppercase font-medium text-muted-foreground">{s.label}</div>
                <div className="mt-2 text-2xl font-bold">{s.value}</div>
              </div>
              <div className={`grid h-10 w-10 place-items-center rounded-lg ${s.cls}`}>
                <s.icon className="h-5 w-5" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-5">
        <h2 className="text-sm font-semibold mb-3">Pesanan Terbaru dari {name}</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/60">
              <tr className="text-left text-xs uppercase font-semibold text-muted-foreground">
                <th className="px-3 py-2">No. Pesanan</th>
                <th className="px-3 py-2">Pembeli</th>
                <th className="px-3 py-2">Total</th>
                <th className="px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {mpOrders.slice(0, 8).map(o => (
                <tr key={o.id} className="border-t border-border">
                  <td className="px-3 py-2 font-mono text-xs text-primary font-semibold">{o.code}</td>
                  <td className="px-3 py-2">{o.buyerName}</td>
                  <td className="px-3 py-2 font-semibold">{formatIDR(o.total)}</td>
                  <td className="px-3 py-2"><Badge variant="secondary" className="text-xs">{o.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
