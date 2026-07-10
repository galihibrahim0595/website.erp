import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { suppliers, products } from "@/services/data";
import { formatIDR, formatDateTime } from "@/lib/format";

export const Route = createFileRoute("/pembelian")({
  head: () => ({ meta: [{ title: "Pembelian — NovaOMS" }] }),
  component: PembelianPage,
});

function PembelianPage() {
  const pos = Array.from({ length: 12 }, (_, i) => {
    const s = suppliers[i % suppliers.length];
    const p = products[i % products.length];
    return {
      id: `PO-${1000 + i}`,
      supplier: s.name,
      itemName: p.name,
      qty: 20 + (i % 6) * 10,
      total: (200_000 + i * 40_000) * (1 + i % 4),
      status: ["Draft", "Menunggu Kirim", "Diterima", "Selesai"][i % 4],
      createdAt: new Date(Date.now() - i * 86400000).toISOString(),
    };
  });

  return (
    <div className="p-6 space-y-4">
      <PageHeader title="Pembelian" subtitle="Purchase order ke supplier" actions={
        <Button size="sm"><Plus className="h-3.5 w-3.5" /> Buat PO</Button>
      } />
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/60">
            <tr className="text-left text-xs uppercase font-semibold text-muted-foreground">
              <th className="px-4 py-3">No. PO</th>
              <th className="px-4 py-3">Supplier</th>
              <th className="px-4 py-3">Item</th>
              <th className="px-4 py-3 text-right">Qty</th>
              <th className="px-4 py-3 text-right">Total</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Tanggal</th>
            </tr>
          </thead>
          <tbody>
            {pos.map(po => (
              <tr key={po.id} className="border-t border-border hover:bg-muted/30">
                <td className="px-4 py-3 font-mono text-xs text-primary font-semibold">{po.id}</td>
                <td className="px-4 py-3 font-medium">{po.supplier}</td>
                <td className="px-4 py-3">{po.itemName}</td>
                <td className="px-4 py-3 text-right tabular-nums">{po.qty}</td>
                <td className="px-4 py-3 text-right font-semibold">{formatIDR(po.total)}</td>
                <td className="px-4 py-3"><Badge variant="secondary">{po.status}</Badge></td>
                <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{formatDateTime(po.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
