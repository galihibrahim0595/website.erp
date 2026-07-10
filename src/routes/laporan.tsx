import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { formatIDR } from "@/lib/format";

export const Route = createFileRoute("/laporan")({
  head: () => ({ meta: [{ title: "Laporan — NovaOMS" }] }),
  component: LaporanPage,
});

const monthly = Array.from({ length: 12 }, (_, i) => ({
  bulan: ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Ags","Sep","Okt","Nov","Des"][i],
  penjualan: 40_000_000 + Math.random() * 80_000_000,
  pesanan: 400 + Math.round(Math.random() * 600),
}));

function LaporanPage() {
  return (
    <div className="p-6 space-y-4">
      <PageHeader title="Laporan" subtitle="Analitik penjualan dan operasional" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <h2 className="text-sm font-semibold mb-4">Penjualan per Bulan</h2>
          <div className="h-72">
            <ResponsiveContainer>
              <AreaChart data={monthly}>
                <defs><linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.546 0.215 262.9)" stopOpacity={0.4}/>
                  <stop offset="100%" stopColor="oklch(0.546 0.215 262.9)" stopOpacity={0}/>
                </linearGradient></defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.008 255)" />
                <XAxis dataKey="bulan" tick={{fontSize:11}} />
                <YAxis tick={{fontSize:11}} tickFormatter={v => `${(v/1_000_000).toFixed(0)}jt`} />
                <Tooltip formatter={(v: number) => formatIDR(v)} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Area dataKey="penjualan" stroke="oklch(0.546 0.215 262.9)" fill="url(#g1)" strokeWidth={2}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-5">
          <h2 className="text-sm font-semibold mb-4">Volume Pesanan</h2>
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.008 255)" />
                <XAxis dataKey="bulan" tick={{fontSize:11}} />
                <YAxis tick={{fontSize:11}} />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="pesanan" fill="oklch(0.68 0.13 235)" radius={[6,6,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}
