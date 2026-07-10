import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ClipboardCheck, Plus } from "lucide-react";
import { products } from "@/services/data";
import { formatNumber } from "@/lib/format";
import { useState } from "react";

export const Route = createFileRoute("/gudang/opname")({
  head: () => ({ meta: [{ title: "Stock Opname — NovaOMS" }] }),
  component: OpnamePage,
});

function OpnamePage() {
  const items = products.flatMap(p => p.variants.slice(0, 2).map(v => ({ p, v }))).slice(0, 20);
  const [counts, setCounts] = useState<Record<string, string>>({});

  return (
    <div className="p-6 space-y-4">
      <PageHeader
        title="Stock Opname"
        subtitle="Rekonsiliasi antara stock sistem dengan hasil hitung fisik"
        actions={<Button size="sm"><Plus className="h-3.5 w-3.5" /> Sesi Opname Baru</Button>}
      />

      <Card className="p-5 flex items-center gap-4">
        <div className="grid h-11 w-11 place-items-center rounded-lg bg-primary/10 text-primary">
          <ClipboardCheck className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="font-semibold text-sm">Sesi Aktif: Opname November 2026</div>
          <div className="text-xs text-muted-foreground">Gudang Jakarta Pusat · Dimulai 2 hari lalu</div>
        </div>
        <Badge className="bg-warning/15 text-warning border-warning/30">In Progress</Badge>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/60">
              <tr className="text-left text-xs uppercase font-semibold text-muted-foreground">
                <th className="px-4 py-3">Produk</th>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3 text-right">Sistem</th>
                <th className="px-4 py-3 text-right w-40">Fisik</th>
                <th className="px-4 py-3 text-right">Selisih</th>
              </tr>
            </thead>
            <tbody>
              {items.map(({ p, v }) => {
                const sys = 20 + Math.floor(Math.random() * 40);
                const fisik = counts[v.id] ? Number(counts[v.id]) : sys;
                const diff = fisik - sys;
                return (
                  <tr key={v.id} className="border-t border-border">
                    <td className="px-4 py-3 font-medium">{p.name}</td>
                    <td className="px-4 py-3 font-mono text-xs">{v.sku}</td>
                    <td className="px-4 py-3 text-right tabular-nums">{formatNumber(sys)}</td>
                    <td className="px-4 py-3 text-right">
                      <Input
                        value={counts[v.id] ?? ""}
                        onChange={e => setCounts(c => ({ ...c, [v.id]: e.target.value }))}
                        placeholder={String(sys)}
                        className="h-8 text-right font-semibold"
                      />
                    </td>
                    <td className={`px-4 py-3 text-right font-bold tabular-nums ${diff === 0 ? "text-muted-foreground" : diff > 0 ? "text-success" : "text-destructive"}`}>
                      {diff > 0 ? "+" : ""}{diff}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-border flex justify-end gap-2">
          <Button variant="outline">Simpan Draft</Button>
          <Button>Selesaikan Opname</Button>
        </div>
      </Card>
    </div>
  );
}
