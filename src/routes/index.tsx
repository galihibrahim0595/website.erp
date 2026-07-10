import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import {
  ShoppingCart, TrendingUp, Package, Warehouse,
  Clock, Truck, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, CartesianGrid, PieChart, Pie, Cell, Legend,
} from "recharts";
import { orders, products, stock } from "@/services/data";
import { formatIDR, formatNumber } from "@/lib/format";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — NovaOMS" },
      { name: "description", content: "Ringkasan penjualan, pesanan, produk, dan stock." },
    ],
  }),
  component: Dashboard,
});

const salesData = Array.from({ length: 14 }, (_, i) => ({
  day: `${i + 1}`,
  sales: 3_500_000 + Math.round(Math.random() * 6_000_000),
  orders: 30 + Math.round(Math.random() * 40),
}));

const mpData = [
  { name: "Shopee", value: 42, color: "oklch(0.65 0.22 25)" },
  { name: "TikTok", value: 28, color: "oklch(0.30 0.03 260)" },
  { name: "Tokopedia", value: 20, color: "oklch(0.66 0.16 152)" },
  { name: "Lazada", value: 10, color: "oklch(0.62 0.20 262)" },
];

function StatCard({
  label, value, delta, deltaPositive = true, icon: Icon, accent,
}: {
  label: string; value: string; delta?: string; deltaPositive?: boolean;
  icon: React.ElementType; accent: string;
}) {
  return (
    <Card className="p-5 gap-0">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</div>
          <div className="mt-2 text-2xl font-bold tracking-tight truncate">{value}</div>
          {delta && (
            <div className={`mt-1 inline-flex items-center gap-1 text-xs font-medium ${deltaPositive ? "text-success" : "text-destructive"}`}>
              {deltaPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {delta}
            </div>
          )}
        </div>
        <div className={`grid h-10 w-10 place-items-center rounded-lg shrink-0 ${accent}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}

function Dashboard() {
  const totalPesananHariIni = orders.filter(o => {
    const d = new Date(o.createdAt);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  }).length;
  const totalPenjualan = orders.filter(o => o.status === "completed").reduce((s, o) => s + o.total, 0);
  const totalStock = stock.reduce((s, r) => s + r.available, 0);
  const menungguProses = orders.filter(o => o.status === "ready_to_process").length;
  const menungguPickup = orders.filter(o => o.status === "waiting_pickup").length;

  const topProducts = products.slice(0, 5).map((p, i) => ({
    name: p.name, terjual: 120 - i * 18,
  }));

  return (
    <div className="p-6 space-y-6">
      <PageHeader title="Dashboard" subtitle="Ringkasan performa toko hari ini" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard label="Pesanan Hari Ini" value={formatNumber(totalPesananHariIni)} delta="+12%" icon={ShoppingCart} accent="bg-primary/10 text-primary" />
        <StatCard label="Total Penjualan" value={formatIDR(totalPenjualan)} delta="+8.4%" icon={TrendingUp} accent="bg-success/10 text-success" />
        <StatCard label="Total Produk" value={formatNumber(products.length)} icon={Package} accent="bg-info/10 text-info" />
        <StatCard label="Total Stock" value={formatNumber(totalStock)} delta="-3.2%" deltaPositive={false} icon={Warehouse} accent="bg-warning/10 text-warning" />
        <StatCard label="Menunggu Diproses" value={formatNumber(menungguProses)} icon={Clock} accent="bg-warning/10 text-warning" />
        <StatCard label="Menunggu Pickup" value={formatNumber(menungguPickup)} icon={Truck} accent="bg-primary/10 text-primary" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold">Grafik Penjualan</h2>
              <p className="text-xs text-muted-foreground">14 hari terakhir</p>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer>
              <AreaChart data={salesData}>
                <defs>
                  <linearGradient id="gradSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.546 0.215 262.9)" stopOpacity={0.4}/>
                    <stop offset="100%" stopColor="oklch(0.546 0.215 262.9)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.008 255)" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} stroke="oklch(0.52 0.02 258)" />
                <YAxis tick={{ fontSize: 11 }} stroke="oklch(0.52 0.02 258)" tickFormatter={(v) => `${(v/1_000_000).toFixed(1)}jt`} />
                <Tooltip
                  contentStyle={{ borderRadius: 8, border: "1px solid oklch(0.92 0.008 255)", fontSize: 12 }}
                  formatter={(v: number) => formatIDR(v)}
                />
                <Area type="monotone" dataKey="sales" stroke="oklch(0.546 0.215 262.9)" strokeWidth={2} fill="url(#gradSales)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-sm font-semibold mb-1">Marketplace</h2>
          <p className="text-xs text-muted-foreground mb-4">Kontribusi penjualan</p>
          <div className="h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={mpData} dataKey="value" innerRadius={55} outerRadius={85} paddingAngle={2}>
                  {mpData.map((d) => <Cell key={d.name} fill={d.color} />)}
                </Pie>
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Tooltip formatter={(v: number) => `${v}%`} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2 p-5">
          <h2 className="text-sm font-semibold mb-1">Produk Terlaris</h2>
          <p className="text-xs text-muted-foreground mb-4">Berdasarkan unit terjual bulan ini</p>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={topProducts} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.008 255)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} stroke="oklch(0.52 0.02 258)" />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={160} stroke="oklch(0.52 0.02 258)" />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="terjual" fill="oklch(0.546 0.215 262.9)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-sm font-semibold mb-3">Aktivitas Terakhir</h2>
          <ul className="space-y-3">
            {orders.slice(0, 6).map((o) => (
              <li key={o.id} className="flex items-start gap-3 text-sm">
                <div className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 text-primary shrink-0">
                  <ShoppingCart className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{o.code}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {o.buyerName} · {formatIDR(o.total)}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
