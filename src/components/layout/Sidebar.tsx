import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import {
  LayoutDashboard, Package, ShoppingCart, Warehouse, Store,
  Truck, Users, UserCircle, FileBarChart, Settings, ChevronDown,
  ShoppingBag,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { orders } from "@/services/data";

type Item = { label: string; to?: string; count?: number; children?: Item[] };
type Group = {
  label: string;
  icon: React.ElementType;
  to?: string;
  children?: Item[];
};

const counts = orders.reduce((acc, order) => {
  acc[order.status] = (acc[order.status] ?? 0) + 1;
  return acc;
}, {} as Record<string, number>);
counts.dikirim = orders.filter((o) => o.awb && ["waiting_pickup", "completed"].includes(o.status)).length;

const nav: Group[] = [
  { label: "Dashboard", icon: LayoutDashboard, to: "/" },
  {
    label: "Produk", icon: Package, children: [
      { label: "Semua Produk", to: "/produk" },
      { label: "Produk Aktif", to: "/produk/aktif" },
      { label: "Produk Nonaktif", to: "/produk/nonaktif" },
      { label: "Draft", to: "/produk/draft" },
      { label: "Mapping SKU", to: "/produk/mapping" },
    ],
  },
  {
    label: "Pesanan", icon: ShoppingCart, children: [
      { label: "Menunggu Diproses", to: "/pesanan/siap-diproses", count: counts.ready_to_process ?? 0 },
      { label: "Menunggu Dicetak", to: "/pesanan/packing", count: counts.packing ?? 0 },
      { label: "Menunggu Pickup", to: "/pesanan/menunggu-pickup", count: counts.waiting_pickup ?? 0 },
      { label: "Pesanan Dikirim", to: "/pesanan/selesai", count: counts.completed ?? 0 },
      { label: "Sedang Diproses Marketplace", to: "/pesanan/selesai", count: counts.completed ?? 0 },
      { label: "Pesanan Selesai", to: "/pesanan/selesai", count: counts.completed ?? 0 },
    ],
  },
  {
    label: "Gudang", icon: Warehouse, children: [
      { label: "Dashboard Gudang", to: "/gudang" },
      { label: "Stock", to: "/gudang/stock" },
      { label: "Stock Masuk", to: "/gudang/masuk" },
      { label: "Stock Keluar", to: "/gudang/keluar" },
      { label: "Penyesuaian Stock", to: "/gudang/penyesuaian" },
      { label: "Transfer Gudang", to: "/gudang/transfer" },
      { label: "Opname", to: "/gudang/opname" },
    ],
  },
  {
    label: "Marketplace", icon: Store, children: [
      { label: "Shopee", to: "/marketplace/shopee" },
      { label: "TikTok Shop", to: "/marketplace/tiktok" },
      { label: "Tokopedia", to: "/marketplace/tokopedia" },
      { label: "Lazada", to: "/marketplace/lazada" },
    ],
  },
  { label: "Pembelian", icon: Truck, to: "/pembelian" },
  { label: "Supplier", icon: Users, to: "/supplier" },
  { label: "Pelanggan", icon: UserCircle, to: "/pelanggan" },
  { label: "Laporan", icon: FileBarChart, to: "/laporan" },
  { label: "Pengaturan", icon: Settings, to: "/pengaturan" },
];

export function Sidebar({ collapsed }: { collapsed: boolean }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const initialOpen = nav.find((g) => g.children?.some((c) => pathname === c.to || pathname.startsWith(c.to)))?.label;
  const [open, setOpen] = useState<Record<string, boolean>>(initialOpen ? { [initialOpen]: true } : {});

  const isActive = (to: string) => pathname === to;
  const isGroupActive = (g: Group) =>
    g.to ? isActive(g.to) : !!g.children?.some((c) => c.to && (pathname === c.to || pathname.startsWith(c.to)));

  return (
    <aside
      className={cn(
        "flex flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200 shrink-0",
        collapsed ? "w-16" : "w-64",
      )}
    >
      {/* Brand */}
      <div className="flex items-center gap-2 px-4 h-14 border-b border-sidebar-border">
        <div className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground shrink-0">
          <ShoppingBag className="h-4 w-4" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <div className="text-sm font-bold tracking-tight truncate">NovaOMS</div>
            <div className="text-[10px] text-muted-foreground truncate">Omnichannel ERP</div>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
        {nav.map((g) => {
          const Icon = g.icon;
          if (g.to) {
            return (
              <Link
                key={g.label}
                to={g.to}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive(g.to)
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/60",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span className="truncate">{g.label}</span>}
              </Link>
            );
          }
          const groupOpen = collapsed ? false : (open[g.label] ?? isGroupActive(g));
          return (
            <div key={g.label}>
              <button
                type="button"
                onClick={() => setOpen((o) => ({ ...o, [g.label]: !groupOpen }))}
                className={cn(
                  "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isGroupActive(g)
                    ? "text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/60",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left truncate">{g.label}</span>
                    <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", groupOpen && "rotate-180")} />
                  </>
                )}
              </button>
              {!collapsed && groupOpen && g.children && (
                <div className="mt-0.5 ml-4 border-l border-sidebar-border pl-3 py-0.5 space-y-0.5">
                  {g.children.map((c) => (
                    <Link
                      key={`${c.label}-${c.to}`}
                      to={c.to}
                      className={cn(
                        "block rounded-md px-3 py-1.5 text-[13px] transition-colors",
                        isActive(c.to)
                          ? "bg-primary/10 text-primary font-semibold"
                          : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
                      )}
                    >
                      {c.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {!collapsed && (
        <div className="border-t border-sidebar-border p-3 text-[11px] text-muted-foreground">
          v1.0.0 · © NovaOMS
        </div>
      )}
    </aside>
  );
}
