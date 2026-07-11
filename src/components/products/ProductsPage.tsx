import { Fragment as FragmentWithKey, useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Search, Upload, Download, RefreshCw, Plus, ChevronDown, ChevronRight,
  Store, Pencil, Copy, Archive, Trash2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PageHeader } from "@/components/layout/AppLayout";
import { cn } from "@/lib/utils";
import { products as allProducts, getProductStock, getVariantStock, getProductMappingStatus, setProductStatus, deleteProduct } from "@/services/data";
import type { Product, ProductStatus, Marketplace } from "@/types";
import { formatIDR, formatNumber, timeAgo } from "@/lib/format";

const marketplaceLabels: Record<Marketplace, string> = {
  shopee: "Shopee", tiktok: "TikTok", tokopedia: "Tokopedia", lazada: "Lazada",
  website: "Website", whatsapp: "WhatsApp", offline: "Offline", manual: "Manual",
};
const marketplaceColors: Record<Marketplace, string> = {
  shopee: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  tiktok: "bg-foreground/10 text-foreground border-foreground/20",
  tokopedia: "bg-green-500/10 text-green-600 border-green-500/20",
  lazada: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  website: "bg-primary/10 text-primary border-primary/20",
  whatsapp: "bg-emerald-600/10 text-emerald-700 border-emerald-600/20",
  offline: "bg-muted text-muted-foreground border-border",
  manual: "bg-muted text-muted-foreground border-border",
};

type DateFilter = "all" | "today" | "yesterday" | "7d" | "30d";

export function ProductsPage({
  title = "Semua Produk",
  statusFilter,
  mappingOnly,
  showAddButton,
}: {
  title?: string;
  statusFilter?: ProductStatus;
  mappingOnly?: boolean;
  showAddButton?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [marketplace, setMarketplace] = useState<Marketplace | "all">("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [status, setStatus] = useState<ProductStatus | "all">("all");
  const [mapping, setMapping] = useState<"all" | "mapped" | "unmapped" | "partial">(mappingOnly ? "unmapped" : "all");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [page, setPage] = useState(1);
  const [sortKey, setSortKey] = useState<"name" | "price" | "stock" | "updated">("updated");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [refreshKey, setRefreshKey] = useState(0);
  const navigate = useNavigate();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list: Product[] = allProducts.filter((p) => {
      if (statusFilter && p.status !== statusFilter) return false;
      if (status !== "all" && p.status !== status) return false;
      if (marketplace !== "all" && p.marketplace !== marketplace) return false;
      if (mapping !== "all" && getProductMappingStatus(p) !== mapping) return false;

      if (dateFilter !== "all") {
        const ms = { today: 86_400_000, yesterday: 2 * 86_400_000, "7d": 7 * 86_400_000, "30d": 30 * 86_400_000 }[dateFilter];
        if (Date.now() - new Date(p.updatedAt).getTime() > ms) return false;
      }

      if (q) {
        const hitProduct =
          p.name.toLowerCase().includes(q) ||
          p.masterSku.toLowerCase().includes(q);
        const hitVariant = p.variants.some((v) =>
          v.sku.toLowerCase().includes(q) ||
          v.warehouseSku?.toLowerCase().includes(q) ||
          v.barcode?.toLowerCase().includes(q)
        );
        if (!hitProduct && !hitVariant) return false;
      }
      return true;
    });

    list = [...list].sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortKey === "name") return a.name.localeCompare(b.name) * dir;
      if (sortKey === "price") return (a.variants[0]?.price - b.variants[0]?.price) * dir;
      if (sortKey === "stock") return (getProductStock(a.id) - getProductStock(b.id)) * dir;
      return (new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()) * dir;
    });
    return list;
  }, [search, marketplace, dateFilter, status, mapping, statusFilter, sortKey, sortDir, refreshKey]);

  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageProducts = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const toggleExpand = (id: string) => setExpanded((e) => ({ ...e, [id]: !e[id] }));
  const toggleAll = (checked: boolean) => {
    const next: Record<string, boolean> = {};
    if (checked) pageProducts.forEach((p) => (next[p.id] = true));
    setSelected(next);
  };
  const allSelected = pageProducts.length > 0 && pageProducts.every((p) => selected[p.id]);

  const setSort = (k: typeof sortKey) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(k); setSortDir("desc"); }
  };

  const handleEdit = (product: Product) => {
    navigate({ to: `/produk/tambah?mode=edit&id=${product.id}` });
  };
  const handleCopy = (product: Product) => {
    navigate({ to: `/produk/tambah?mode=copy&id=${product.id}` });
  };
  const handleArchive = (product: Product) => {
    if (!window.confirm(`Arsipkan produk ${product.name}?`)) return;
    setProductStatus(product.id, "draft");
    setRefreshKey((value) => value + 1);
  };
  const handleDelete = (product: Product) => {
    if (!window.confirm(`Hapus produk ${product.name}?`)) return;
    deleteProduct(product.id);
    setSelected((prev) => {
      const next = { ...prev };
      delete next[product.id];
      return next;
    });
    setRefreshKey((value) => value + 1);
  };

  return (
    <div className="p-6 space-y-4">
      <PageHeader
        title={title}
        subtitle={`${formatNumber(filtered.length)} produk ditemukan`}
        actions={
          <>
            <Button variant="outline" size="sm"><Upload className="h-3.5 w-3.5" /> Import</Button>
            <Button variant="outline" size="sm"><Download className="h-3.5 w-3.5" /> Export</Button>
            <Button variant="outline" size="sm"><RefreshCw className="h-3.5 w-3.5" /> Sinkronisasi</Button>
            {showAddButton ? (
              <Link to="/produk/tambah" className="inline-flex">
                <Button size="sm" className="bg-primary hover:bg-primary-hover"><Plus className="h-3.5 w-3.5" /> Tambah Produk</Button>
              </Link>
            ) : null}
          </>
        }
      />

      {/* Filter Toolbar */}
      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <FilterSelect label="Grup Toko" value="all" options={[["all","Semua Toko"],["gr1","Grup Fashion"],["gr2","Grup Elektronik"]]} onChange={() => {}} />
          <FilterSelect
            label="Marketplace"
            value={marketplace}
            options={[["all","Semua Marketplace"],["shopee","Shopee"],["tiktok","TikTok Shop"],["tokopedia","Tokopedia"],["lazada","Lazada"]]}
            onChange={(v) => setMarketplace(v as Marketplace | "all")}
          />
          <FilterSelect
            label="Status"
            value={status}
            options={[["all","Semua Status"],["active","Aktif"],["inactive","Nonaktif"],["draft","Draft"]]}
            onChange={(v) => setStatus(v as ProductStatus | "all")}
          />
          <FilterSelect
            label="Mapping SKU"
            value={mapping}
            options={[["all","Semua"],["mapped","Sudah Mapping"],["partial","Sebagian"],["unmapped","Belum Mapping"]]}
            onChange={(v) => setMapping(v as typeof mapping)}
          />
          <Button variant="outline" size="sm" className="text-muted-foreground">+ Filter Lainnya</Button>
        </div>

        {/* Date pills */}
        <div className="flex items-center gap-1 border-t border-border pt-3">
          {([
            ["all", "Semua"], ["today", "Hari Ini"], ["yesterday", "Kemarin"],
            ["7d", "7 Hari"], ["30d", "30 Hari"],
          ] as [DateFilter, string][]).map(([k, l]) => (
            <button
              key={k}
              onClick={() => setDateFilter(k)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-colors",
                dateFilter === k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent",
              )}
            >{l}</button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Cari nama produk, SKU induk, SKU variasi, atau barcode..."
            className="pl-10 h-11 text-sm"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto max-h-[calc(100vh-360px)] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-muted/60 backdrop-blur">
              <tr className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                <th className="w-10 px-3 py-3"><Checkbox checked={allSelected} onCheckedChange={(c) => toggleAll(Boolean(c))} /></th>
                <th className="w-8 px-2 py-3"></th>
                <th className="w-14 px-2 py-3">Foto</th>
                <Th onClick={() => setSort("name")} active={sortKey === "name"} dir={sortDir}>Nama Produk</Th>
                <th className="px-3 py-3">Marketplace</th>
                <th className="px-3 py-3">SKU Induk</th>
                <th className="px-3 py-3">SKU Variasi</th>
                <th className="px-3 py-3">Barcode</th>
                <th className="px-3 py-3">Kategori</th>
                <Th onClick={() => setSort("price")} active={sortKey === "price"} dir={sortDir}>Harga</Th>
                <Th onClick={() => setSort("stock")} active={sortKey === "stock"} dir={sortDir}>Stock Gudang</Th>
                <th className="px-3 py-3">Status Mapping</th>
                <th className="px-3 py-3">Status</th>
                <Th onClick={() => setSort("updated")} active={sortKey === "updated"} dir={sortDir}>Terakhir Update</Th>
                <th className="w-16 px-3 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {pageProducts.length === 0 && (
                <tr><td colSpan={15} className="text-center py-14 text-sm text-muted-foreground">
                  Tidak ada produk sesuai filter.
                </td></tr>
              )}
              {pageProducts.map((p) => {
                const isExpanded = !!expanded[p.id];
                const priceRange = { min: Math.min(...p.variants.map(v => v.price)), max: Math.max(...p.variants.map(v => v.price)) };
                const totalStock = getProductStock(p.id);
                const mappingStatus = getProductMappingStatus(p);
                return (
                  <FragmentWithKey key={p.id}>
                    <tr
                      className="border-t border-border hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-3 py-3"><Checkbox checked={!!selected[p.id]} onCheckedChange={(c) => setSelected((s) => ({...s, [p.id]: Boolean(c)}))} /></td>
                      <td className="px-2 py-3">
                        <button onClick={() => toggleExpand(p.id)} className="grid h-6 w-6 place-items-center rounded hover:bg-accent text-muted-foreground">
                          {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                        </button>
                      </td>
                      <td className="px-2 py-3">
                        <img src={p.photo} alt={p.name} className="h-11 w-11 rounded-md object-cover border border-border" loading="lazy" />
                      </td>
                      <td className="px-3 py-3 max-w-[280px]">
                        <div className="font-semibold text-foreground truncate">{p.name}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{p.variants.length} variasi · {p.brand}</div>
                      </td>
                      <td className="px-3 py-3">
                        <span className={cn("inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium", marketplaceColors[p.marketplace])}>
                          <Store className="h-3 w-3" /> {marketplaceLabels[p.marketplace]}
                        </span>
                      </td>
                      <td className="px-3 py-3 font-mono text-xs">{p.masterSku}</td>
                      <td className="px-3 py-3 text-xs text-muted-foreground">—</td>
                      <td className="px-3 py-3 text-xs text-muted-foreground">—</td>
                      <td className="px-3 py-3 text-xs">{p.category}</td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        {priceRange.min === priceRange.max
                          ? <span className="font-semibold">{formatIDR(priceRange.min)}</span>
                          : <span className="font-semibold">{formatIDR(priceRange.min)} <span className="text-muted-foreground font-normal">-</span> {formatIDR(priceRange.max)}</span>}
                      </td>
                      <td className="px-3 py-3">
                        <span className={cn("font-semibold", totalStock < 50 ? "text-warning" : "text-foreground")}>
                          {formatNumber(totalStock)}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <MappingBadge status={mappingStatus} />
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="px-3 py-3 text-xs text-muted-foreground whitespace-nowrap">{timeAgo(p.updatedAt)}</td>
                      <ProductActionMenu
                        product={p}
                        onEdit={handleEdit}
                        onCopy={handleCopy}
                        onArchive={handleArchive}
                        onDelete={handleDelete}
                      />
                    </tr>

                    {isExpanded && p.variants.map((v) => {
                      const st = getVariantStock(v.id);
                      return (
                        <tr key={v.id} className="border-t border-border bg-muted/20">
                          <td></td>
                          <td></td>
                          <td className="px-2 py-2">
                            <div className="h-8 w-8 rounded bg-muted border border-border" />
                          </td>
                          <td className="px-3 py-2 pl-6">
                            <div className="text-xs text-muted-foreground">↳ Variasi</div>
                            <div className="text-sm font-medium">{v.color} {v.size}</div>
                          </td>
                          <td className="px-3 py-2 text-xs text-muted-foreground">—</td>
                          <td className="px-3 py-2 text-xs text-muted-foreground">—</td>
                          <td className="px-3 py-2 font-mono text-xs">{v.sku}</td>
                          <td className="px-3 py-2 font-mono text-xs">{v.barcode}</td>
                          <td className="px-3 py-2"></td>
                          <td className="px-3 py-2 text-xs font-semibold">{formatIDR(v.price)}</td>
                          <td className="px-3 py-2 text-xs font-semibold">{formatNumber(st)}</td>
                          <td className="px-3 py-2">
                            {v.mappingStatus === "mapped"
                              ? <Badge variant="outline" className="border-success/30 bg-success/10 text-success text-[10px] h-5">✓ {v.warehouseSku}</Badge>
                              : <Link to="/produk/mapping" className="text-[11px] text-primary font-medium hover:underline">Belum Mapping</Link>}
                          </td>
                          <td colSpan={3}></td>
                        </tr>
                      );
                    })}
                  </FragmentWithKey>

                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border text-xs text-muted-foreground">
          <div>
            Menampilkan <span className="font-semibold text-foreground">{(currentPage - 1) * pageSize + 1}</span>–
            <span className="font-semibold text-foreground">{Math.min(currentPage * pageSize, filtered.length)}</span> dari{" "}
            <span className="font-semibold text-foreground">{formatNumber(filtered.length)}</span> produk
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => setPage(p => p - 1)}>Sebelumnya</Button>
            <div className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground font-semibold">{currentPage}</div>
            <span className="px-1">/ {totalPages}</span>
            <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => setPage(p => p + 1)}>Selanjutnya</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProductActionMenu({
  product,
  onEdit,
  onCopy,
  onArchive,
  onDelete,
}: {
  product: Product;
  onEdit: (product: Product) => void;
  onCopy: (product: Product) => void;
  onArchive: (product: Product) => void;
  onDelete: (product: Product) => void;
}) {
  return (
    <td className="px-3 py-3 text-right">
      <TooltipProvider delayDuration={0}>
        <div className="flex items-center justify-end gap-1">
          <ActionButton tooltip="Edit" icon={<Pencil className="h-3.5 w-3.5" />} onClick={() => onEdit(product)} />
          <ActionButton tooltip="Salin" icon={<Copy className="h-3.5 w-3.5" />} onClick={() => onCopy(product)} />
          <ActionButton tooltip="Arsipkan" icon={<Archive className="h-3.5 w-3.5" />} onClick={() => onArchive(product)} />
          <ActionButton tooltip="Hapus" icon={<Trash2 className="h-3.5 w-3.5" />} onClick={() => onDelete(product)} destructive />
        </div>
      </TooltipProvider>
    </td>
  );
}

function ActionButton({
  tooltip,
  icon,
  onClick,
  destructive = false,
}: {
  tooltip: string;
  icon: React.ReactNode;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            "h-7 w-7 text-muted-foreground hover:bg-accent hover:text-foreground",
            destructive && "text-destructive hover:bg-destructive/10 hover:text-destructive",
          )}
          onClick={onClick}
          aria-label={tooltip}
        >
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );
}

function Th({ children, onClick, active, dir }: { children: React.ReactNode; onClick?: () => void; active?: boolean; dir?: "asc" | "desc" }) {
  return (
    <th className="px-3 py-3">
      <button onClick={onClick} className={cn("inline-flex items-center gap-1 font-semibold uppercase tracking-wide text-xs", active ? "text-primary" : "text-muted-foreground hover:text-foreground")}>
        {children}
        {active && <span>{dir === "asc" ? "↑" : "↓"}</span>}
      </button>
    </th>
  );
}

function FilterSelect({
  label, value, options, onChange,
}: {
  label: string;
  value: string;
  options: [string, string][];
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="appearance-none h-9 pl-3 pr-8 rounded-md border border-input bg-background text-sm hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/30 min-w-[150px]"
      >
        {options.map(([v, l]) => <option key={v} value={v}>{v === "all" ? label : l}</option>)}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
    </div>
  );
}

function StatusBadge({ status }: { status: ProductStatus }) {
  if (status === "active") return <Badge className="bg-success/15 text-success border-success/30 hover:bg-success/20">Aktif</Badge>;
  if (status === "inactive") return <Badge variant="secondary">Nonaktif</Badge>;
  return <Badge variant="outline" className="border-warning/40 text-warning bg-warning/10">Draft</Badge>;
}

function MappingBadge({ status }: { status: "mapped" | "unmapped" | "partial" }) {
  if (status === "mapped") return <Badge className="bg-success/15 text-success border-success/30 hover:bg-success/20">Termapping</Badge>;
  if (status === "partial") return <Badge variant="outline" className="border-warning/40 text-warning bg-warning/10">Sebagian</Badge>;
  return <Badge variant="outline" className="border-destructive/40 text-destructive bg-destructive/10">Belum</Badge>;
}
