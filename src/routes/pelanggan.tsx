import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { customers } from "@/services/data";
import { formatIDR, formatNumber } from "@/lib/format";

export const Route = createFileRoute("/pelanggan")({
  head: () => ({ meta: [{ title: "Pelanggan — NovaOMS" }] }),
  component: PelangganPage,
});

function PelangganPage() {
  return (
    <div className="p-6 space-y-4">
      <PageHeader title="Pelanggan" subtitle="Basis data pembeli dari semua marketplace" />
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/60">
            <tr className="text-left text-xs uppercase font-semibold text-muted-foreground">
              <th className="px-4 py-3">Nama</th>
              <th className="px-4 py-3">Telepon</th>
              <th className="px-4 py-3 text-right">Total Pesanan</th>
              <th className="px-4 py-3 text-right">Total Belanja</th>
            </tr>
          </thead>
          <tbody>
            {customers.map(c => (
              <tr key={c.id} className="border-t border-border hover:bg-muted/30">
                <td className="px-4 py-3 flex items-center gap-3">
                  <div className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
                    {c.name.split(" ").map(x=>x[0]).join("").slice(0,2)}
                  </div>
                  <span className="font-medium">{c.name}</span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{c.phone}</td>
                <td className="px-4 py-3 text-right tabular-nums">{formatNumber(c.totalOrders)}</td>
                <td className="px-4 py-3 text-right font-semibold">{formatIDR(c.totalSpent)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
