import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, ArrowRight, Wand2 } from "lucide-react";
import { products } from "@/services/data";
import type { ProductVariant } from "@/types";

export const Route = createFileRoute("/produk/mapping")({
  head: () => ({ meta: [{ title: "Mapping SKU — NovaOMS" }] }),
  component: MappingPage,
});

type Row = { productName: string; variant: ProductVariant };

function MappingPage() {
  const [search, setSearch] = useState("");
  const [mapped, setMapped] = useState<Record<string, string>>({});

  const rows: Row[] = useMemo(() => {
    const all: Row[] = [];
    products.forEach((p) => p.variants.forEach((v) => all.push({ productName: p.name, variant: v })));
    const q = search.trim().toLowerCase();
    return all.filter((r) => {
      const v = r.variant;
      if (v.mappingStatus === "mapped" && !mapped[v.id]) return false;
      if (!q) return true;
      return r.productName.toLowerCase().includes(q) ||
        v.sku.toLowerCase().includes(q) ||
        v.color?.toLowerCase().includes(q) ||
        v.size?.toLowerCase().includes(q);
    });
  }, [search, mapped]);

  const autoSuggest = (v: ProductVariant) => {
    const parts = [v.color, v.size].filter(Boolean).join("-").toUpperCase();
    return parts ? `WH-${parts}` : "";
  };

  const autoMapAll = () => {
    const next: Record<string, string> = { ...mapped };
    rows.slice(0, 20).forEach((r) => { next[r.variant.id] = autoSuggest(r.variant); });
    setMapped(next);
  };

  return (
    <div className="p-6 space-y-4">
      <PageHeader
        title="Mapping SKU"
        subtitle="Hubungkan SKU marketplace dengan SKU gudang"
        actions={<Button size="sm" onClick={autoMapAll}><Wand2 className="h-3.5 w-3.5" /> Auto-Mapping</Button>}
      />

      <Card className="p-4">
        <div className="relative max-w-lg">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari produk, SKU, warna, ukuran..." className="pl-10 h-10" />
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_1fr_auto] items-center px-6 py-3 bg-muted/50 border-b border-border text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <div>Marketplace SKU</div>
          <div className="px-4"></div>
          <div>Gudang SKU</div>
          <div className="pl-4">Aksi</div>
        </div>
        <div className="divide-y divide-border">
          {rows.slice(0, 40).map((r) => {
            const v = r.variant;
            const current = mapped[v.id] ?? (v.mappingStatus === "mapped" ? v.warehouseSku ?? "" : "");
            return (
              <div key={v.id} className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2 px-6 py-4 hover:bg-muted/20">
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">{r.productName}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
                    <Badge variant="outline" className="font-mono">{v.sku}</Badge>
                    {v.color && <Badge variant="secondary">{v.color}</Badge>}
                    {v.size && <Badge variant="secondary">{v.size}</Badge>}
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground shrink-0 mx-4" />
                <div>
                  <Input
                    value={current}
                    onChange={(e) => setMapped((m) => ({ ...m, [v.id]: e.target.value }))}
                    placeholder={autoSuggest(v)}
                    className="h-9 font-mono text-sm"
                  />
                </div>
                <div className="pl-4">
                  {current
                    ? <Badge className="bg-success/15 text-success border-success/30">Termapping</Badge>
                    : <Badge variant="outline" className="border-destructive/40 text-destructive bg-destructive/10">Belum Mapping</Badge>}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
