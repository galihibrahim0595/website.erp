import { useEffect, useMemo, useRef, useState } from "react";
import {
  Search, Printer, Package as PackageIcon, Truck, CheckCircle2,
  MoreHorizontal, Filter, Download, Calendar, RefreshCcw,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/AppLayout";
import { cn } from "@/lib/utils";
import { warehouses, getOrders, updateOrderStatus, updateOrdersStatus } from "@/services/data";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import type { Order, OrderStatus, Marketplace, Courier, PaymentStatus } from "@/types";
import { formatIDR, formatDateTime, formatNumber } from "@/lib/format";

// ---------- meta ----------
const statusMeta: Record<OrderStatus, { label: string; cls: string }> = {
  waiting_payment:  { label: "Menunggu Dibayar", cls: "bg-warning/15 text-warning border-warning/30" },
  ready_to_process: { label: "Menunggu Diproses", cls: "bg-info/15 text-info border-info/30" },
  picking:          { label: "Picking",          cls: "bg-primary/15 text-primary border-primary/30" },
  packing:          { label: "Menunggu Dicetak", cls: "bg-primary/15 text-primary border-primary/30" },
  waiting_pickup:   { label: "Menunggu Pickup",  cls: "bg-accent text-primary border-primary/30" },
  completed:        { label: "Selesai",          cls: "bg-success/15 text-success border-success/30" },
  returned:         { label: "Retur",            cls: "bg-destructive/15 text-destructive border-destructive/30" },
};

const marketplaceMeta: Record<Marketplace, { label: string; dot: string; cls: string }> = {
  shopee:    { label: "Shopee",     dot: "bg-orange-500",  cls: "bg-orange-500/10 text-orange-600 border-orange-500/20" },
  tiktok:    { label: "TikTok",     dot: "bg-neutral-900", cls: "bg-neutral-900/10 text-neutral-900 border-neutral-900/20 dark:text-neutral-100" },
  tokopedia: { label: "Tokopedia",  dot: "bg-green-600",   cls: "bg-green-500/10 text-green-700 border-green-500/20" },
  lazada:    { label: "Lazada",     dot: "bg-purple-600",  cls: "bg-purple-500/10 text-purple-700 border-purple-500/20" },
  website:   { label: "Website",    dot: "bg-blue-600",    cls: "bg-blue-500/10 text-blue-700 border-blue-500/20" },
  whatsapp:  { label: "WhatsApp",   dot: "bg-emerald-700", cls: "bg-emerald-600/10 text-emerald-800 border-emerald-600/20" },
  offline:   { label: "Offline",    dot: "bg-slate-500",   cls: "bg-slate-500/10 text-slate-700 border-slate-500/20" },
  manual:    { label: "Manual",     dot: "bg-slate-400",   cls: "bg-slate-400/10 text-slate-600 border-slate-400/20" },
};

const courierMeta: Record<Courier, { label: string; cls: string }> = {
  jnt:      { label: "J&T",         cls: "bg-red-500/10 text-red-600 border-red-500/20" },
  jne:      { label: "JNE",         cls: "bg-blue-500/10 text-blue-700 border-blue-500/20" },
  sicepat:  { label: "SiCepat",     cls: "bg-pink-500/10 text-pink-600 border-pink-500/20" },
  anteraja: { label: "AnterAja",    cls: "bg-red-600/10 text-red-700 border-red-600/20" },
  ninja:    { label: "Ninja Xpress",cls: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20" },
  spx:      { label: "SPX Express", cls: "bg-orange-500/10 text-orange-600 border-orange-500/20" },
  pos:      { label: "Pos Indonesia", cls: "bg-orange-600/10 text-orange-700 border-orange-600/20" },
  idexpress:{ label: "ID Express",  cls: "bg-cyan-500/10 text-cyan-700 border-cyan-500/20" },
};

const paymentMeta: Record<PaymentStatus, { label: string; cls: string }> = {
  unpaid: { label: "Belum Dibayar", cls: "bg-warning/15 text-warning border-warning/30" },
  paid:   { label: "Sudah Dibayar", cls: "bg-success/15 text-success border-success/30" },
  cod:    { label: "COD",           cls: "bg-info/15 text-info border-info/30" },
  refund: { label: "Refund",        cls: "bg-destructive/15 text-destructive border-destructive/30" },
};

// ---------- tabs config ----------
type StatusTabKey = OrderStatus | "all" | "dikirim";
const statusTabs: { key: StatusTabKey; label: string }[] = [
  { key: "all", label: "Semua Pesanan" },
  { key: "ready_to_process", label: "Menunggu Diproses" },
  { key: "packing", label: "Menunggu Dicetak" },
  { key: "waiting_pickup", label: "Menunggu Pickup" },
  { key: "dikirim", label: "Pesanan Dikirim" },
  { key: "completed", label: "Selesai" },
  { key: "returned", label: "Retur" },
];

const marketplaceTabs: (Marketplace | "all")[] = [
  "all", "shopee", "tiktok", "tokopedia", "lazada", "website", "whatsapp", "offline",
];

const courierTabs: (Courier | "all")[] = [
  "all", "jnt", "jne", "sicepat", "anteraja", "ninja", "spx", "pos", "idexpress",
];

const paymentTabs: (PaymentStatus | "all")[] = ["all", "unpaid", "paid", "cod", "refund"];

type DateFilter = "all" | "today" | "yesterday" | "7d" | "30d";
const dateTabs: { key: DateFilter; label: string }[] = [
  { key: "all", label: "Semua Tanggal" },
  { key: "today", label: "Hari Ini" },
  { key: "yesterday", label: "Kemarin" },
  { key: "7d", label: "7 Hari" },
  { key: "30d", label: "30 Hari" },
];

// ---------- helpers ----------
function slugFor(s: StatusTabKey): string {
  return {
    waiting_payment: "menunggu-dibayar",
    ready_to_process: "siap-diproses",
    picking: "picking",
    packing: "packing",
    waiting_pickup: "menunggu-pickup",
    completed: "selesai",
    returned: "retur",
    dikirim: "selesai",
  }[s as OrderStatus | "dikirim"];
}

function withinDate(iso: string, f: DateFilter): boolean {
  if (f === "all") return true;
  const d = new Date(iso);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const t = d.getTime();
  if (f === "today") return t >= startOfToday;
  if (f === "yesterday") return t >= startOfToday - 86400_000 && t < startOfToday;
  if (f === "7d") return t >= startOfToday - 7 * 86400_000;
  if (f === "30d") return t >= startOfToday - 30 * 86400_000;
  return true;
}

// ---------- small ui pieces ----------
function ChipTab({
  active, onClick, children, count,
}: { active: boolean; onClick: () => void; children: React.ReactNode; count?: number }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 h-8 rounded-full text-xs font-medium border transition-colors whitespace-nowrap",
        active
          ? "bg-primary text-primary-foreground border-primary shadow-sm"
          : "bg-background text-muted-foreground border-border hover:text-foreground hover:border-primary/40",
      )}
    >
      {children}
      {typeof count === "number" && (
        <span className={cn(
          "text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
          active ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground",
        )}>{formatNumber(count)}</span>
      )}
    </button>
  );
}

function StatMini({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide truncate">{label}</div>
      <div className={cn("mt-1 text-lg font-bold tracking-tight", tone)}>{value}</div>
    </div>
  );
}

// ---------- main ----------
export function OrdersPage({ status = "all", title }: { status?: OrderStatus | "all"; title: string }) {
  const [search, setSearch] = useState("");
  const [mpFilter, setMpFilter] = useState<Marketplace | "all">("all");
  const [courierFilter, setCourierFilter] = useState<Courier | "all">("all");
  const [payFilter, setPayFilter] = useState<PaymentStatus | "all">("all");
  const [statusFilter, setStatusFilter] = useState<StatusTabKey>(status);
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [scanOpen, setScanOpen] = useState(false);
  const [scanFilterCourier, setScanFilterCourier] = useState<Courier | "all">("all");
  const [scanQuery, setScanQuery] = useState("");
  const [scannedOrders, setScannedOrders] = useState<Order[]>([]);
  const scanInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const getAudioContext = () => {
    const context = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (context.state === "suspended") {
      void context.resume();
    }
    return context;
  };

  const playTone = (frequency: number, duration: number) => {
    const context = getAudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.12, context.currentTime);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + duration);
    oscillator.onended = () => {
      gain.disconnect();
      oscillator.disconnect();
    };
  };

  const playSuccess = () => {
    // No web audio feedback for successful scans.
  };
  const playDuplicate = () => {
    playTone(600, 0.08);
    setTimeout(() => playTone(600, 0.08), 150);
  };
  const playError = () => playTone(220, 0.24);

  const { data: orders = [] } = useQuery({
    queryKey: ["orders"],
    queryFn: getOrders,
    staleTime: 0,
    refetchOnWindowFocus: false,
  });

  const updateOrdersMutation = useMutation({
    mutationFn: (updates: { id: string; status: Order["status"] }[]) => updateOrdersStatus(updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });

  useEffect(() => {
    if (scanOpen) {
      scanInputRef.current?.focus();
    }
  }, [scanOpen]);

  const scannedOrder = useMemo(() => {
    const query = scanQuery.trim().toLowerCase();
    if (!query) return null;
    return orders.find((o) => {
      if (o.status !== "packing") return false;
      if (scanFilterCourier !== "all" && o.courier !== scanFilterCourier) return false;
      return [o.awb, o.code, o.id].some((value) => value?.toLowerCase() === query);
    }) ?? null;
  }, [orders, scanQuery, scanFilterCourier]);

  const focusScanInput = () => {
    setTimeout(() => scanInputRef.current?.focus(), 0);
  };

  useEffect(() => {
    if (!scanOpen) {
      setScannedOrders([]);
      setScanQuery("");
    }
  }, [scanOpen]);

  const addScannedOrder = () => {
    if (!scannedOrder) {
      playError();
      toast.error("Nomor Resi / Nomor Paket tidak ditemukan.");
      setScanQuery("");
      focusScanInput();
      return;
    }

    if (scannedOrders.some((o) => o.id === scannedOrder.id)) {
      playDuplicate();
      toast.error("Pesanan sudah ada dalam daftar scan.");
      setScanQuery("");
      focusScanInput();
      return;
    }

    setScannedOrders((prev) => [...prev, scannedOrder]);
    toast.success("Pesanan berhasil ditambahkan.");
    setScanQuery("");
    focusScanInput();
  };

  const handleScanKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    addScannedOrder();
  };

  const confirmScanSend = () => {
    if (scannedOrders.length === 0) return;
    const count = scannedOrders.length;
    updateOrdersMutation.mutate(scannedOrders.map((o) => ({ id: o.id, status: "waiting_pickup" })), {
      onSuccess: () => {
        setScanOpen(false);
        setScannedOrders([]);
        setScanQuery("");
        toast.success(`${count} pesanan berhasil dipindahkan ke Menunggu Pickup.`);
      },
    });
  };

  // pre-filter by route status (kept as base) then apply in-page filters
  const routeScoped = useMemo(
    () => (status === "all" ? orders : orders.filter((o) => o.status === status)),
    [orders, status],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return routeScoped.filter((o) => {
      if (mpFilter !== "all" && o.marketplace !== mpFilter) return false;
      if (courierFilter !== "all" && o.courier !== courierFilter) return false;
      if (payFilter !== "all" && o.paymentStatus !== payFilter) return false;
      if (status === "all" && statusFilter !== "all") {
        if (statusFilter === "dikirim") {
          if (o.status !== "completed") return false;
        } else if (o.status !== statusFilter) {
          return false;
        }
      }
      if (!withinDate(o.createdAt, dateFilter)) return false;
      if (!q) return true;
      return (
        o.code.toLowerCase().includes(q) ||
        o.buyerName.toLowerCase().includes(q) ||
        (o.awb?.toLowerCase().includes(q) ?? false) ||
        o.items.some((i) => i.sku.toLowerCase().includes(q) || i.productName.toLowerCase().includes(q))
      );
    });
  }, [routeScoped, search, mpFilter, courierFilter, payFilter, statusFilter, dateFilter, status]);

  // counts (against route-scoped baseline)
  const mpCounts = useMemo(() => {
    const c: Record<string, number> = { all: routeScoped.length };
    routeScoped.forEach((o) => { c[o.marketplace] = (c[o.marketplace] ?? 0) + 1; });
    return c;
  }, [routeScoped]);
  const courierCounts = useMemo(() => {
    const c: Record<string, number> = { all: routeScoped.length };
    routeScoped.forEach((o) => { c[o.courier] = (c[o.courier] ?? 0) + 1; });
    return c;
  }, [routeScoped]);
  const payCounts = useMemo(() => {
    const c: Record<string, number> = { all: routeScoped.length };
    routeScoped.forEach((o) => { c[o.paymentStatus] = (c[o.paymentStatus] ?? 0) + 1; });
    return c;
  }, [routeScoped]);
  const statusCounts = useMemo(() => {
    const c: Record<string, number> = { all: routeScoped.length, dikirim: 0 };
    routeScoped.forEach((o) => {
      c[o.status] = (c[o.status] ?? 0) + 1;
      if (o.status === "completed" && o.awb) c.dikirim += 1;
    });
    return c;
  }, [routeScoped]);

  // stat cards
  const stats = useMemo(() => {
    const today = orders.filter((o) => withinDate(o.createdAt, "today")).length;
    const belumProses = orders.filter((o) => o.status === "ready_to_process").length;
    const menungguDicetak = orders.filter((o) => o.status === "packing").length;
    const pickup = orders.filter((o) => o.status === "waiting_pickup").length;
    const dikirim = orders.filter((o) => o.awb && ["waiting_pickup", "completed"].includes(o.status)).length;
    const selesai = orders.filter((o) => o.status === "completed").length;
    return { today, belumProses, menungguDicetak, pickup, dikirim, selesai };
  }, [orders]);

  const processOrder = (id: string) => {
    updateOrdersMutation.mutate([{ id, status: "packing" }]);
  };

  const processSelectedOrders = () => {
    if (selected.size === 0) {
      alert("Pilih minimal satu pesanan.");
      return;
    }

    const updates = orders
      .filter((o) => selected.has(o.id) && o.status === "ready_to_process")
      .map((o) => ({ id: o.id, status: "packing" }));

    if (updates.length === 0) {
      alert("Tidak ada pesanan yang bisa diproses.");
      return;
    }

    updateOrdersMutation.mutate(updates, {
      onSuccess: () => setSelected(new Set()),
    });
  };

  const [syncOpen, setSyncOpen] = useState(false);
  const [syncOption, setSyncOption] = useState<"orders" | "status" | "awb" | "payment" | "all">("all");

  const startSync = () => {
    const result = {
      orders: Math.floor(Math.random() * 5),
      status: Math.floor(Math.random() * 4),
      awb: Math.floor(Math.random() * 3),
    };
    const counts = {
      orders: syncOption === "all" ? Math.floor(Math.random() * 8) : syncOption === "orders" ? result.orders : 0,
      status: syncOption === "all" ? Math.floor(Math.random() * 6) : syncOption === "status" ? result.status : 0,
      awb: syncOption === "all" ? Math.floor(Math.random() * 4) : syncOption === "awb" ? result.awb : 0,
    };
    toast.success(
      `Sinkronisasi berhasil\nPesanan baru: ${counts.orders}\nStatus berubah: ${counts.status}\nNomor resi: ${counts.awb}`,
    );
    setSyncOpen(false);
  };

  const cetakResi = (id: string) => {
    const order = updateOrderStatus(id, "waiting_pickup");
    if (order && !order.awb) {
      order.awb = `${order.courier.toUpperCase()}${Date.now()}`;
    }
    queryClient.invalidateQueries({ queryKey: ["orders"] });
  };

  const toggleAll = (checked: boolean) => {
    setSelected(checked ? new Set(filtered.map((o) => o.id)) : new Set());
  };
  const toggleOne = (id: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  };

  return (
    <div className="p-6 space-y-4">
      <Toaster />
      <Dialog open={scanOpen} onOpenChange={setScanOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Scan dan Kirim</DialogTitle>
            <DialogDescription>Masukkan nomor resi atau kode pesanan untuk memindahkan pesanan ke Menunggu Pickup.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Jasa Kirim</label>
              <Select value={scanFilterCourier} onValueChange={(value) => setScanFilterCourier(value as Courier | "all") }>
                <SelectTrigger className="mt-2 w-full">
                  <SelectValue placeholder="Semua" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua</SelectItem>
                  {courierTabs.filter((c) => c !== "all").map((courier) => (
                    <SelectItem key={courier} value={courier}>{courierMeta[courier].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Nomor Resi / Kode Pesanan</label>
              <Input
                ref={scanInputRef}
                autoFocus
                className="mt-2 w-full"
                placeholder="Scan atau masukkan nomor..."
                value={scanQuery}
                onChange={(e) => setScanQuery(e.target.value)}
                onKeyDown={handleScanKeyDown}
              />
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm font-semibold">Total hasil scan: {scannedOrders.length} Pesanan</div>
                {scannedOrders.length > 0 && (
                  <Button variant="outline" size="sm" onClick={() => setScannedOrders([])}>
                    Kosongkan
                  </Button>
                )}
              </div>
              {scannedOrders.length === 0 ? (
                <div className="text-sm text-muted-foreground mt-4">Belum ada pesanan yang discan.</div>
              ) : (
                <div className="mt-4 space-y-3 max-h-72 overflow-y-auto">
                  {scannedOrders.map((order) => (
                    <div key={order.id} className="rounded-lg border border-border bg-background p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="font-semibold text-sm">{order.code}</div>
                        <Badge variant="outline" className={cn("gap-1.5", marketplaceMeta[order.marketplace].cls)}>
                          {marketplaceMeta[order.marketplace].label}
                        </Badge>
                      </div>
                      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 text-sm text-muted-foreground">
                        <div>Kurir: {courierMeta[order.courier].label}</div>
                        <div>Pembeli: {order.buyerName}</div>
                        <div>Produk: {order.items.map((item) => `${item.productName} (${item.variantLabel})`).join(", ")}</div>
                        <div>No. Resi: {order.awb ?? "—"}</div>
                        <div>Status: {statusMeta[order.status].label}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setScanOpen(false)}>Batal</Button>
            <Button size="sm" onClick={confirmScanSend} disabled={scannedOrders.length === 0 || updateOrdersMutation.isLoading}>
              Konfirmasi & Kirim
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={syncOpen} onOpenChange={setSyncOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sinkronisasi Pesanan</DialogTitle>
            <DialogDescription>Pilih jenis sinkronisasi yang ingin dijalankan.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-2">
            {[
              { key: "orders", label: "Sinkron Pesanan Baru" },
              { key: "status", label: "Sinkron Status Pesanan" },
              { key: "awb", label: "Sinkron Nomor Resi" },
              { key: "payment", label: "Sinkron Pembayaran" },
              { key: "all", label: "Sinkron Semua" },
            ].map((option) => (
              <button
                key={option.key}
                type="button"
                className={cn(
                  "w-full rounded-md border px-4 py-3 text-left text-sm font-medium transition",
                  syncOption === option.key
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background text-foreground border-border hover:bg-accent/60",
                )}
                onClick={() => setSyncOption(option.key as typeof syncOption)}
              >
                {option.label}
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setSyncOpen(false)}>Batal</Button>
            <Button size="sm" onClick={startSync}>Mulai Sinkronisasi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <PageHeader
        title={title}
        subtitle={`${formatNumber(filtered.length)} dari ${formatNumber(routeScoped.length)} pesanan`}
        actions={<> 
          {status === "packing" && (
            <Button variant="outline" size="sm" className="inline-flex items-center gap-2" onClick={() => setScanOpen(true)}>
              <PackageIcon className="h-3.5 w-3.5" /> Scan dan Kirim
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setSyncOpen(true)}>
            <RefreshCcw className="h-3.5 w-3.5" /> Sinkronisasi
          </Button>
          {status === "ready_to_process" ? (
            <Button variant="outline" size="sm" onClick={processSelectedOrders}>
              Proses Pesanan ({selected.size})
            </Button>
          ) : status !== "packing" ? (
            <Button variant="outline" size="sm" asChild>
              <Link to="/pesanan/menunggu-dibayar">Menunggu Dibayar</Link>
            </Button>
          ) : null}
          <Button variant="outline" size="sm">
            <Printer className="h-3.5 w-3.5" /> Cetak Massal {selected.size > 0 && `(${selected.size})`}
          </Button>
          <Button size="sm"><Download className="h-3.5 w-3.5" /> Ekspor</Button>
        </>}
      />

      {/* stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatMini label="Order Hari Ini" value={formatNumber(stats.today)} tone="text-primary" />
        <StatMini label="Belum Diproses" value={formatNumber(stats.belumProses)} tone="text-warning" />
        <StatMini label="Menunggu Dicetak" value={formatNumber(stats.menungguDicetak)} tone="text-info" />
        <StatMini label="Menunggu Pickup" value={formatNumber(stats.pickup)} tone="text-primary" />
        <StatMini label="Dikirim" value={formatNumber(stats.dikirim)} tone="text-foreground" />
        <StatMini label="Selesai" value={formatNumber(stats.selesai)} tone="text-success" />
      </div>

      {/* sticky filter bar */}
      <div className="sticky top-0 z-20 -mx-6 px-6 py-3 bg-background/95 backdrop-blur border-b border-border space-y-3">
        {/* marketplace */}
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Filter className="h-3 w-3 text-muted-foreground" />
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">Marketplace</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {marketplaceTabs.map((k) => (
              <ChipTab key={k} active={mpFilter === k} onClick={() => setMpFilter(k)} count={mpCounts[k] ?? 0}>
                {k === "all" ? "Semua Marketplace" : (
                  <span className="inline-flex items-center gap-1.5">
                    <span className={cn("h-1.5 w-1.5 rounded-full", marketplaceMeta[k].dot)} />
                    {marketplaceMeta[k].label}
                  </span>
                )}
              </ChipTab>
            ))}
          </div>
        </div>

        {/* courier */}
        <div>
          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Jasa Kirim</div>
          <div className="flex flex-wrap gap-1.5">
            {courierTabs.map((k) => (
              <ChipTab key={k} active={courierFilter === k} onClick={() => setCourierFilter(k)} count={courierCounts[k] ?? 0}>
                {k === "all" ? "Semua Kurir" : courierMeta[k].label}
              </ChipTab>
            ))}
          </div>
        </div>

        {/* payment + date */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div>
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Pembayaran</div>
            <div className="flex flex-wrap gap-1.5">
              {paymentTabs.map((k) => (
                <ChipTab key={k} active={payFilter === k} onClick={() => setPayFilter(k)} count={payCounts[k] ?? 0}>
                  {k === "all" ? "Semua" : paymentMeta[k].label}
                </ChipTab>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 inline-flex items-center gap-1">
              <Calendar className="h-3 w-3" /> Tanggal
            </div>
            <div className="flex flex-wrap gap-1.5">
              {dateTabs.map((t) => (
                <ChipTab key={t.key} active={dateFilter === t.key} onClick={() => setDateFilter(t.key)}>
                  {t.label}
                </ChipTab>
              ))}
              <ChipTab active={false} onClick={() => { /* placeholder */ }}>Custom Range</ChipTab>
            </div>
          </div>
        </div>
      </div>

      {/* main card */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {/* status tabs (route-linked for known statuses; in-page filter when on /pesanan) */}
        <div className="flex overflow-x-auto border-b border-border">
          {statusTabs.map((t) => {
            const active = status === "all" ? statusFilter === t.key : status === t.key;
            const count = statusCounts[t.key] ?? 0;
            const inner = (
              <span className="inline-flex items-center gap-2">
                {t.label}
                <span className={cn(
                  "text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
                  active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                )}>{count}</span>
              </span>
            );
            const cls = cn(
              "px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 -mb-px transition-colors",
              active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
            );
            if (status === "all") {
              return <button key={t.key} className={cls} onClick={() => setStatusFilter(t.key)}>{inner}</button>;
            }
            return (
              <a key={t.key} href={t.key === "all" ? "/pesanan" : `/pesanan/${slugFor(t.key)}`} className={cls}>
                {inner}
              </a>
            );
          })}
        </div>

        {/* search */}
        <div className="p-4 border-b border-border">
          <div className="relative max-w-xl">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nomor pesanan, pembeli, nomor resi, SKU, atau nama produk..."
              className="pl-10 h-10"
            />
          </div>
        </div>

        {/* table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted/60 backdrop-blur">
              <tr className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                <th className="w-10 px-3 py-3">
                  <Checkbox
                    checked={selected.size > 0 && selected.size === filtered.length}
                    onCheckedChange={(c) => toggleAll(!!c)}
                  />
                </th>
                <th className="px-3 py-3">Marketplace</th>
                <th className="px-3 py-3">No. Pesanan</th>
                <th className="px-3 py-3">Tanggal</th>
                <th className="px-3 py-3">Pembeli</th>
                <th className="px-3 py-3">Produk</th>
                <th className="px-3 py-3 text-center">Qty</th>
                <th className="px-3 py-3">Kurir</th>
                <th className="px-3 py-3">No. Resi</th>
                <th className="px-3 py-3">Total</th>
                <th className="px-3 py-3">Pembayaran</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Gudang</th>
                <th className="px-3 py-3">Admin</th>
                <th className="px-3 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr><td colSpan={15} className="text-center py-14 text-muted-foreground">Tidak ada pesanan sesuai filter.</td></tr>
              )}
              {filtered.map((o) => {
                const mp = marketplaceMeta[o.marketplace];
                const c = courierMeta[o.courier];
                const totalQty = o.items.reduce((s, it) => s + it.qty, 0);
                const wh = warehouses.find((w) => w.id === o.warehouseId);
                return (
                  <tr key={o.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-3 py-3">
                      <Checkbox
                        checked={selected.has(o.id)}
                        onCheckedChange={(chk) => toggleOne(o.id, !!chk)}
                      />
                    </td>
                    <td className="px-3 py-3">
                      <Badge variant="outline" className={cn("gap-1.5", mp.cls)}>
                        <span className={cn("h-1.5 w-1.5 rounded-full", mp.dot)} />
                        {mp.label}
                      </Badge>
                    </td>
                    <td className="px-3 py-3">
                      <div className="font-mono text-xs font-semibold text-primary">{o.code}</div>
                    </td>
                    <td className="px-3 py-3 text-xs text-muted-foreground whitespace-nowrap">{formatDateTime(o.createdAt)}</td>
                    <td className="px-3 py-3 text-sm font-medium whitespace-nowrap">{o.buyerName}</td>
                    <td className="px-3 py-3 max-w-[260px]">
                      {o.items.map((it, i) => (
                        <div key={i} className="text-sm truncate">
                          <span className="font-medium">{it.productName}</span>{" "}
                          <span className="text-muted-foreground">· {it.variantLabel} × {it.qty}</span>
                        </div>
                      ))}
                    </td>
                    <td className="px-3 py-3 text-center font-semibold">{totalQty}</td>
                    <td className="px-3 py-3">
                      <Badge variant="outline" className={c.cls}>{c.label}</Badge>
                    </td>
                    <td className="px-3 py-3 font-mono text-xs whitespace-nowrap">{o.awb ?? "—"}</td>
                    <td className="px-3 py-3 font-semibold whitespace-nowrap">{formatIDR(o.total)}</td>
                    <td className="px-3 py-3">
                      <Badge variant="outline" className={paymentMeta[o.paymentStatus].cls}>
                        {paymentMeta[o.paymentStatus].label}
                      </Badge>
                    </td>
                    <td className="px-3 py-3">
                      <Badge variant="outline" className={statusMeta[o.status].cls}>{statusMeta[o.status].label}</Badge>
                    </td>
                    <td className="px-3 py-3 text-xs text-muted-foreground whitespace-nowrap">{wh?.name ?? "—"}</td>
                    <td className="px-3 py-3 text-xs whitespace-nowrap">{o.adminName}</td>
                    <td className="px-3 py-3 text-right whitespace-nowrap">
                      {o.status === "packing" && (
                        <Button size="sm" onClick={() => cetakResi(o.id)}>
                          <Printer className="h-3.5 w-3.5" /> Cetak Resi
                        </Button>
                      )}
                      {o.status === "ready_to_process" && (
                        <Button size="sm" variant="outline" onClick={() => processOrder(o.id)}><PackageIcon className="h-3.5 w-3.5" /> Proses</Button>
                      )}
                      {o.status === "packing" && (
                        <Button size="sm" variant="outline" onClick={() => cetakResi(o.id)}><Printer className="h-3.5 w-3.5" /> Cetak Resi</Button>
                      )}
                      {o.status === "waiting_pickup" && (
                        <Button size="sm" variant="outline"><Truck className="h-3.5 w-3.5" /> Pickup</Button>
                      )}
                      {o.status === "picking" && (
                        <Button size="sm" variant="outline"><CheckCircle2 className="h-3.5 w-3.5" /> Selesai Pick</Button>
                      )}
                      {!["packing","ready_to_process","waiting_pickup","picking"].includes(o.status) && (
                        <button className="grid h-7 w-7 place-items-center rounded hover:bg-accent text-muted-foreground ml-auto">
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
