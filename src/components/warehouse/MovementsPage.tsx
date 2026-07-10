import { PageHeader } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { stockMovements, products, warehouses } from "@/services/data";
import { formatNumber, formatDateTime } from "@/lib/format";
import type { StockMovement } from "@/types";

export function MovementsPage({
  title, subtitle, type, ctaLabel,
}: { title: string; subtitle: string; type: StockMovement["type"]; ctaLabel: string }) {
  const rows = stockMovements.filter((m) => m.type === type);

  const findVariant = (id: string) => {
    for (const p of products) {
      const v = p.variants.find((x) => x.id === id);
      if (v) return { product: p, variant: v };
    }
    return null;
  };

  return (
    <div className="p-6 space-y-4">
      <PageHeader title={title} subtitle={subtitle} actions={
        <Button size="sm"><Plus className="h-3.5 w-3.5" /> {ctaLabel}</Button>
      } />
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/60">
              <tr className="text-left text-xs uppercase font-semibold text-muted-foreground">
                <th className="px-4 py-3">Referensi</th>
                <th className="px-4 py-3">Produk</th>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Gudang</th>
                <th className="px-4 py-3 text-right">Qty</th>
                <th className="px-4 py-3">Catatan</th>
                <th className="px-4 py-3">Tanggal</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={7} className="text-center py-14 text-muted-foreground">Belum ada data.</td></tr>}
              {rows.map((m) => {
                const info = findVariant(m.variantId);
                const wh = warehouses.find(w => w.id === m.warehouseId);
                return (
                  <tr key={m.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-primary">{m.reference}</td>
                    <td className="px-4 py-3 font-medium">{info?.product.name ?? "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs">{info?.variant.sku}</td>
                    <td className="px-4 py-3 text-xs">{wh?.name}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold">
                      <Badge variant="outline" className={
                        type === "in" ? "bg-success/10 text-success border-success/30" :
                        type === "out" ? "bg-destructive/10 text-destructive border-destructive/30" :
                        "bg-warning/10 text-warning border-warning/30"
                      }>{type === "out" ? "-" : "+"}{formatNumber(m.qty)}</Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-[220px] truncate">{m.note}</td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap">{formatDateTime(m.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
