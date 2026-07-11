import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Warehouse, PackageCheck, PackageMinus, ArrowLeftRight, ClipboardCheck, Boxes } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { warehouses, stock, stockMovements } from "@/services/data";
import { formatNumber } from "@/lib/format";

export const Route = createFileRoute("/gudang/")({
  head: () => ({ meta: [{ title: "Dashboard Gudang — NovaOMS" }] }),
  component: WarehouseDashboard,
});

function WarehouseDashboard() {
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const handleStockUpdated = () => setRefreshKey((value) => value + 1);
    window.addEventListener("stock-updated", handleStockUpdated);
    return () => window.removeEventListener("stock-updated", handleStockUpdated);
  }, []);

  const totalStock = stock.reduce((s, r) => s + r.available, 0);
  const totalReserved = stock.reduce((s, r) => s + r.reserved, 0);
  const inCount = stockMovements.filter(m => m.type === "in").length;
  const outCount = stockMovements.filter(m => m.type === "out").length;

  const shortcuts = [
    { title: "Stock", desc: "Lihat semua stock produk", to: "/gudang/stock", icon: Boxes },
    { title: "Stock Masuk", desc: "Penerimaan barang dari supplier", to: "/gudang/masuk", icon: PackageCheck },
    { title: "Stock Keluar", desc: "Pengeluaran barang manual", to: "/gudang/keluar", icon: PackageMinus },
    { title: "Penyesuaian Stock", desc: "Adjustment stock", to: "/gudang/penyesuaian", icon: ClipboardCheck },
    { title: "Transfer Gudang", desc: "Pindah stock antar gudang", to: "/gudang/transfer", icon: ArrowLeftRight },
    { title: "Opname", desc: "Cek fisik dan rekonsiliasi stock", to: "/gudang/opname", icon: Warehouse },
  ];

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Dashboard Gudang" subtitle="Ringkasan operasional gudang" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Gudang", value: warehouses.length, cls: "bg-primary/10 text-primary" },
          { label: "Total Stock Tersedia", value: formatNumber(totalStock), cls: "bg-success/10 text-success" },
          { label: "Stock Reserved", value: formatNumber(totalReserved), cls: "bg-warning/10 text-warning" },
          { label: "Pergerakan (30 hari)", value: formatNumber(inCount + outCount), cls: "bg-info/10 text-info" },
        ].map((s) => (
          <Card key={s.label} className="p-5">
            <div className="text-xs font-medium uppercase text-muted-foreground tracking-wide">{s.label}</div>
            <div className={`mt-2 inline-flex px-3 py-1 rounded-md text-2xl font-bold ${s.cls}`}>{s.value}</div>
          </Card>
        ))}
      </div>

      <div>
        <h2 className="text-sm font-semibold mb-3">Aksi Gudang</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {shortcuts.map((s) => {
            const Icon = s.icon;
            return (
              <Link key={s.to} to={s.to}>
                <Card className="p-5 hover:border-primary transition-colors cursor-pointer h-full">
                  <div className="flex items-start gap-3">
                    <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary shrink-0">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-semibold text-sm">{s.title}</div>
                      <div className="text-xs text-muted-foreground mt-1">{s.desc}</div>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>

      <Card className="p-5">
        <h2 className="text-sm font-semibold mb-4">Daftar Gudang</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {warehouses.map((w) => {
            const wstock = stock.filter(s => s.warehouseId === w.id).reduce((s, r) => s + r.available, 0);
            return (
              <div key={w.id} className="rounded-lg border border-border p-4">
                <div className="flex items-center gap-2 font-semibold text-sm"><Warehouse className="h-4 w-4 text-primary" /> {w.name}</div>
                <div className="text-xs text-muted-foreground mt-1">{w.location}</div>
                <div className="mt-3 text-2xl font-bold">{formatNumber(wstock)}</div>
                <div className="text-xs text-muted-foreground">unit tersedia</div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
