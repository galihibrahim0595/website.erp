import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Download } from "lucide-react";
import { products, warehouses, stock } from "@/services/data";
import { formatNumber } from "@/lib/format";

export const Route = createFileRoute("/gudang/stock")({
  head: () => ({ meta: [{ title: "Stock Gudang — NovaOMS" }] }),
  component: StockPage,
});

function StockPage() {
  const [search, setSearch] = useState("");
  const [whId, setWhId] = useState<string>("all");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const handleStockUpdated = () => setRefreshKey((value) => value + 1);
    window.addEventListener("stock-updated", handleStockUpdated);
    return () => window.removeEventListener("stock-updated", handleStockUpdated);
  }, []);

  const rows = useMemo(() => {
    const list: { productName: string; sku: string; variantId: string; color?: string; size?: string; perWh: Record<string, number>; total: number }[] = [];
    products.forEach((p) => p.variants.forEach((v) => {
      const perWh: Record<string, number> = {};
      warehouses.forEach((w) => {
        const r = stock.find(s => s.warehouseId === w.id && s.variantId === v.id);
        perWh[w.id] = r?.available ?? 0;
      });
      const total = whId === "all" ? Object.values(perWh).reduce((s, n) => s + n, 0) : (perWh[whId] ?? 0);
      list.push({ productName: p.name, sku: v.sku, variantId: v.id, color: v.color, size: v.size, perWh, total });
    }));
    const q = search.trim().toLowerCase();
    return q ? list.filter(r => r.productName.toLowerCase().includes(q) || r.sku.toLowerCase().includes(q)) : list;
  }, [search, whId]);

  return (
    <div className="p-6 space-y-4">
      <PageHeader title="Stock Gudang" subtitle="Sumber kebenaran stock — sinkron dengan halaman Produk"
        actions={<Button variant="outline" size="sm"><Download className="h-3.5 w-3.5" /> Export</Button>} />

      <Card className="p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Cari produk atau SKU..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 h-10" />
        </div>
        <select value={whId} onChange={e => setWhId(e.target.value)}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm">
          <option value="all">Semua Gudang</option>
          {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto max-h-[calc(100vh-320px)] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-muted/60 backdrop-blur">
              <tr className="text-left text-xs uppercase font-semibold text-muted-foreground">
                <th className="px-4 py-3">Produk</th>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Variasi</th>
                {warehouses.map(w => <th key={w.id} className="px-4 py-3 text-right">{w.name.replace("Gudang ", "")}</th>)}
                <th className="px-4 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 200).map((r) => (
                <tr key={r.variantId} className="border-t border-border hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium max-w-[280px] truncate">{r.productName}</td>
                  <td className="px-4 py-3 font-mono text-xs">{r.sku}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {r.color && <Badge variant="secondary" className="text-[10px]">{r.color}</Badge>}
                      {r.size && <Badge variant="secondary" className="text-[10px]">{r.size}</Badge>}
                    </div>
                  </td>
                  {warehouses.map((w) => (
                    <td key={w.id} className="px-4 py-3 text-right tabular-nums">{formatNumber(r.perWh[w.id])}</td>
                  ))}
                  <td className="px-4 py-3 text-right font-bold tabular-nums">{formatNumber(r.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
