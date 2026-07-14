import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect, useCallback } from "react";
import { PageHeader } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from "@/components/ui/drawer";
import { Search, Download, Upload, Zap, Plus, Link2, Edit, Trash2, Loader2, X, ChevronRight } from "lucide-react";
import { products } from "@/services/data";
import { stock } from "@/services/data";
import { getAuthToken } from "@/lib/auth";
import type { ProductVariant } from "@/types";

export const Route = createFileRoute("/produk/mapping")({
  head: () => ({ meta: [{ title: "Mapping SKU — NovaOMS" }] }),
  component: MappingPage,
});

// ==================== Types ====================

interface WarehouseSkuMapping {
  warehouseSku: string;
  productName: string;
  productId: string;
  variantId: string;
  marketplacesSku?: string;
  photo?: string;
  hargaModal: number;
  hargaJual: number;
  totalStock: number;
  barcode?: string;
  marketplaceMappings: MarketplaceMapping[];
}

interface MarketplaceMapping {
  marketplace: string;
  count: number;
  mappings: SkuMapping[];
}

interface SkuMapping {
  id: number;
  marketplace_variant_id: string;
  marketplace: string;
  marketplace_sku: string;
  warehouse_sku: string;
  product_id?: string;
  product_name?: string;
  color?: string;
  size?: string;
  created_at: string;
  updated_at: string;
}

type MappingStatus = "all" | "mapped" | "partial" | "unmapped";
type FilterMarketplace = "all" | "shopee" | "tokopedia" | "tiktok" | "lazada";

// ==================== Dummy Data ====================

const DUMMY_MAPPINGS: Record<string, SkuMapping[]> = {
  "prd-7-shopee-Hitam-M": [
    {
      id: 1,
      marketplace_variant_id: "prd-7-shopee-Hitam-M",
      marketplace: "shopee",
      marketplace_sku: "KPS-HM",
      warehouse_sku: "KPS-HIT-M",
      product_name: "Kaos Polos Combed 30s",
      color: "Hitam",
      size: "M",
      created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ],
  "prd-7-tiktok-Hitam-M": [
    {
      id: 2,
      marketplace_variant_id: "prd-7-tiktok-Hitam-M",
      marketplace: "tiktok",
      marketplace_sku: "TT-HM",
      warehouse_sku: "KPS-HIT-M",
      product_name: "Kaos Polos Combed 30s",
      color: "Hitam",
      size: "M",
      created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ],
  "prd-7-tokopedia-Hitam-M": [
    {
      id: 3,
      marketplace_variant_id: "prd-7-tokopedia-Hitam-M",
      marketplace: "tokopedia",
      marketplace_sku: "TP-HM",
      warehouse_sku: "KPS-HIT-M",
      product_name: "Kaos Polos Combed 30s",
      color: "Hitam",
      size: "M",
      created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ],
  "prd-7-shopee-Hitam-L": [
    {
      id: 4,
      marketplace_variant_id: "prd-7-shopee-Hitam-L",
      marketplace: "shopee",
      marketplace_sku: "KPS-HL",
      warehouse_sku: "KPS-HIT-L",
      product_name: "Kaos Polos Combed 30s",
      color: "Hitam",
      size: "L",
      created_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ],
  "prd-7-tiktok-Hitam-L": [
    {
      id: 5,
      marketplace_variant_id: "prd-7-tiktok-Hitam-L",
      marketplace: "tiktok",
      marketplace_sku: "TT-HL",
      warehouse_sku: "KPS-HIT-L",
      product_name: "Kaos Polos Combed 30s",
      color: "Hitam",
      size: "L",
      created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ],
  "prd-7-shopee-Putih-M": [
    {
      id: 6,
      marketplace_variant_id: "prd-7-shopee-Putih-M",
      marketplace: "shopee",
      marketplace_sku: "KPS-PM",
      warehouse_sku: "KPS-PUT-M",
      product_name: "Kaos Polos Combed 30s",
      color: "Putih",
      size: "M",
      created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ],
};

// ==================== Helper Components ====================

function StatusBadge({ status }: { status: "mapped" | "partial" | "unmapped" }) {
  const config = {
    mapped: { label: "Sudah Mapping", color: "bg-green-100 text-green-800 border-green-300", icon: "🟢" },
    partial: { label: "Sebagian Mapping", color: "bg-yellow-100 text-yellow-800 border-yellow-300", icon: "🟡" },
    unmapped: { label: "Belum Mapping", color: "bg-red-100 text-red-800 border-red-300", icon: "🔴" },
  };
  const cfg = config[status];
  return (
    <Badge className={`${cfg.color} border font-medium`}>
      {cfg.icon} {cfg.label}
    </Badge>
  );
}

function MarketplaceBadge({ marketplace, count }: { marketplace: string; count: number }) {
  const colors: Record<string, string> = {
    shopee: "bg-red-100 text-red-800 border-red-300",
    tokopedia: "bg-green-100 text-green-800 border-green-300",
    tiktok: "bg-black text-white border-black",
    lazada: "bg-blue-100 text-blue-800 border-blue-300",
  };
  return (
    <Badge className={`${colors[marketplace] || "bg-gray-100 text-gray-800"} border capitalize font-medium`}>
      {marketplace} ({count})
    </Badge>
  );
}

// ==================== MappingStatusBadge ====================

function MappingStatusBadge({ item, onClick }: { item: WarehouseSkuMapping; onClick: () => void }) {
  const totalMappings = item.marketplaceMappings.reduce((sum, m) => sum + m.count, 0);
  const uniqueMarketplaces = item.marketplaceMappings.length;

  let label: string;
  let colorClass: string;

  if (totalMappings === 0) {
    label = "Belum Dihubungkan";
    colorClass = "bg-red-100 text-red-800 border-red-300";
  } else if (uniqueMarketplaces >= 3) {
    label = `Sudah Dihubungkan (${totalMappings})`;
    colorClass = "bg-green-100 text-green-800 border-green-300";
  } else {
    label = `Sebagian Dihubungkan (${uniqueMarketplaces})`;
    colorClass = "bg-yellow-100 text-yellow-800 border-yellow-300";
  }

  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1 hover:opacity-80 transition-opacity"
      type="button"
    >
      <Badge className={`${colorClass} border font-medium`}>
        {label}
      </Badge>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </button>
  );
}

// ==================== MappingToolbar ====================

function MappingToolbar({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  marketplaceFilter,
  onMarketplaceFilterChange,
  onAutoMapping,
  onAddMapping,
  isLoading,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  statusFilter: MappingStatus;
  onStatusFilterChange: (v: MappingStatus) => void;
  marketplaceFilter: FilterMarketplace;
  onMarketplaceFilterChange: (v: FilterMarketplace) => void;
  onAutoMapping: () => void;
  onAddMapping: () => void;
  isLoading: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-end flex-wrap">
        <div className="flex-1 min-w-64">
          <label className="block text-sm font-medium mb-2">Cari SKU / Nama Produk / Barcode</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="KAOS-HIJ-M, Kaos Polos..."
              className="pl-10"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Status Mapping</label>
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value as MappingStatus)}
            className="px-3 py-2 border rounded-lg bg-white text-sm"
          >
            <option value="all">Semua SKU</option>
            <option value="mapped">Sudah Mapping</option>
            <option value="partial">Sebagian Mapping</option>
            <option value="unmapped">Belum Mapping</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Marketplace</label>
          <select
            value={marketplaceFilter}
            onChange={(e) => onMarketplaceFilterChange(e.target.value as FilterMarketplace)}
            className="px-3 py-2 border rounded-lg bg-white text-sm"
          >
            <option value="all">Semua Marketplace</option>
            <option value="shopee">Shopee</option>
            <option value="tokopedia">Tokopedia</option>
            <option value="tiktok">TikTok Shop</option>
            <option value="lazada">Lazada</option>
          </select>
        </div>

        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={onAutoMapping} disabled={isLoading}>
            <Zap className="h-4 w-4 mr-2" />
            Auto Mapping
          </Button>
          <Button size="sm" onClick={onAddMapping} disabled={isLoading}>
            <Plus className="h-4 w-4 mr-2" />
            Tambah Mapping
          </Button>
          <Button size="sm" variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button size="sm" variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>
    </div>
  );
}

// ==================== MappingTable ====================

function MappingTable({
  data,
  isLoading,
  onMapping,
  selectedRows,
  onSelectionChange,
}: {
  data: WarehouseSkuMapping[];
  isLoading: boolean;
  onMapping: (item: WarehouseSkuMapping) => void;
  selectedRows: Set<string>;
  onSelectionChange: (id: string, checked: boolean) => void;
}) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const getMappingStatus = (item: WarehouseSkuMapping): "mapped" | "partial" | "unmapped" => {
    const totalMappings = item.marketplaceMappings.reduce((sum, m) => sum + m.count, 0);
    if (totalMappings === 0) return "unmapped";
    if (totalMappings >= 3) return "mapped";
    return "partial";
  };

  return (
    <div className="overflow-x-auto border rounded-xl bg-white">
      {isLoading ? (
        <div className="px-6 py-12 text-center text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
          Memuat data mapping...
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 border-b border-border sticky top-0">
              <th className="px-4 py-3 text-left w-10">
                <input type="checkbox" className="rounded" />
              </th>
              <th className="px-4 py-3 text-left">Foto</th>
              <th className="px-4 py-3 text-left">SKU Gudang</th>
              <th className="px-4 py-3 text-left">Nama SKU</th>
              <th className="px-4 py-3 text-left">Marketplace Terhubung</th>
              <th className="px-4 py-3 text-left">Hubungan Pemetaan SKU Toko</th>
              <th className="px-4 py-3 text-left">Status Mapping</th>
              <th className="px-4 py-3 text-right">Harga Modal</th>
              <th className="px-4 py-3 text-right">Harga Jual</th>
              <th className="px-4 py-3 text-right">Total Stok</th>
              <th className="px-4 py-3 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {data.map((item) => (
              <tr key={item.warehouseSku} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    className="rounded"
                    checked={selectedRows.has(item.warehouseSku)}
                    onChange={(e) => onSelectionChange(item.warehouseSku, e.target.checked)}
                  />
                </td>
                <td className="px-4 py-3">
                  {item.photo ? (
                    <img src={item.photo} alt={item.productName} className="h-10 w-10 rounded object-cover" />
                  ) : (
                    <div className="h-10 w-10 rounded bg-muted flex items-center justify-center text-xs">No img</div>
                  )}
                </td>
                <td className="px-4 py-3 font-mono font-semibold">{item.warehouseSku}</td>
                <td className="px-4 py-3">
                  <div className="text-sm font-medium">{item.productName}</div>
                  {item.marketplacesSku && <div className="text-xs text-muted-foreground">{item.marketplacesSku}</div>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {item.marketplaceMappings.map((m) => (
                      <MarketplaceBadge key={m.marketplace} marketplace={m.marketplace} count={m.count} />
                    ))}
                    {item.marketplaceMappings.length === 0 && (
                      <span className="text-xs text-muted-foreground">Belum ada</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <MappingStatusBadge item={item} onClick={() => onMapping(item)} />
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={getMappingStatus(item)} />
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <span>{formatCurrency(item.hargaModal)}</span>
                    <button className="text-muted-foreground hover:text-foreground">
                      <Edit className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <span>{formatCurrency(item.hargaJual)}</span>
                    <button className="text-muted-foreground hover:text-foreground">
                      <Edit className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
                <td className="px-4 py-3 text-right font-semibold">{item.totalStock}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => onMapping(item)}
                      className="text-blue-600 hover:text-blue-800 transition-colors"
                      title="Mapping"
                    >
                      <Link2 className="h-4 w-4" />
                    </button>
                    <button className="text-gray-600 hover:text-gray-800 transition-colors" title="Edit">
                      <Edit className="h-4 w-4" />
                    </button>
                    <button className="text-red-600 hover:text-red-800 transition-colors" title="Hapus">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

// ==================== MappingDrawer ====================

function MappingDrawer({
  isOpen,
  onOpenChange,
  item,
  allMappings,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  item: WarehouseSkuMapping | null;
  allMappings: Record<string, SkuMapping[]>;
}) {
  if (!item) return null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Drawer open={isOpen} onOpenChange={onOpenChange}>
      <DrawerContent className="max-w-2xl">
        <DrawerHeader>
          <DrawerTitle>Mapping SKU Gudang</DrawerTitle>
          <DrawerDescription>Hubungkan SKU gudang dengan marketplace</DrawerDescription>
        </DrawerHeader>

        <div className="px-6 py-4 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Info Gudang */}
          <Card className="p-4 bg-muted/30 border-0">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-1">SKU Gudang</div>
                <div className="font-mono font-semibold text-sm">{item.warehouseSku}</div>
              </div>
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-1">Nama Produk</div>
                <div className="text-sm font-medium">{item.productName}</div>
              </div>
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-1">Harga Modal</div>
                <div className="text-sm font-semibold">{formatCurrency(item.hargaModal)}</div>
              </div>
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-1">Harga Jual</div>
                <div className="text-sm font-semibold">{formatCurrency(item.hargaJual)}</div>
              </div>
            </div>
          </Card>

          {/* Marketplace Mappings */}
          <div className="space-y-4">
            <h3 className="font-semibold">Marketplace</h3>

            {["shopee", "tokopedia", "tiktok", "lazada"].map((marketplace) => {
              const mappings = item.marketplaceMappings.find((m) => m.marketplace === marketplace)?.mappings || [];
              return (
                <div key={marketplace} className="space-y-2 p-3 border rounded-lg bg-muted/20">
                  <div className="flex items-center justify-between">
                    <div className="font-medium capitalize flex items-center gap-2">
                      {marketplace}
                      {mappings.length > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {mappings.length}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {mappings.length > 0 ? (
                    <div className="space-y-2 ml-2">
                      {mappings.map((m) => (
                        <div key={m.id} className="text-xs space-y-1 p-2 bg-white rounded border flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div>
                              <span className="text-muted-foreground">Produk: </span>
                              <span className="font-medium">{m.product_name || "-"}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Variasi: </span>
                              <span className="font-medium">
                                {[m.color, m.size].filter(Boolean).join(" / ") || "-"}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <span className="text-xs">SKU: {m.marketplace_sku}</span>
                              <span>→</span>
                              <span className="font-mono font-semibold text-foreground">{m.warehouse_sku}</span>
                            </div>
                          </div>
                          <button className="text-red-600 hover:text-red-800 flex-shrink-0 mt-1">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground ml-2">Belum ada mapping</div>
                  )}

                  <button className="text-xs text-blue-600 hover:text-blue-800 font-medium mt-2">
                    + Tambah {marketplace}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <DrawerFooter className="border-t">
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Tambah Marketplace
            </Button>
            <Button>Simpan Mapping</Button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

// ==================== Main MappingPage ====================

function MappingPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<MappingStatus>("all");
  const [marketplaceFilter, setMarketplaceFilter] = useState<FilterMarketplace>("all");
  const [allMappings, setAllMappings] = useState<Record<string, SkuMapping[]>>(DUMMY_MAPPINGS);
  const [isLoadingMappings, setIsLoadingMappings] = useState(false);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<WarehouseSkuMapping | null>(null);

  // Load mappings on mount
  useEffect(() => {
    const loadMappings = async () => {
      setIsLoadingMappings(true);
      try {
        const token = getAuthToken();
        if (!token) {
          setAllMappings(DUMMY_MAPPINGS);
          setIsLoadingMappings(false);
          return;
        }

        const response = await fetch("/api/sku-mappings", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          setAllMappings(DUMMY_MAPPINGS);
          setIsLoadingMappings(false);
          return;
        }

        const data = await response.json();
        const mappingsByVariant: Record<string, SkuMapping[]> = {};
        data.mappings.forEach((m: SkuMapping) => {
          if (!mappingsByVariant[m.marketplace_variant_id]) {
            mappingsByVariant[m.marketplace_variant_id] = [];
          }
          mappingsByVariant[m.marketplace_variant_id].push(m);
        });
        setAllMappings(mappingsByVariant);
      } catch (error) {
        console.error("Error loading mappings:", error);
        setAllMappings(DUMMY_MAPPINGS);
      } finally {
        setIsLoadingMappings(false);
      }
    };

    loadMappings();
  }, []);

  // Build table data from products
  const tableData: WarehouseSkuMapping[] = useMemo(() => {
    const dataMap: Record<string, WarehouseSkuMapping> = {};

    products.forEach((product) => {
      product.variants.forEach((variant) => {
        // Create warehouse SKU (simplified)
        const warehouseSku = `${product.masterSku}-${variant.color?.slice(0, 3) || ""}-${variant.size || ""}`.toUpperCase().trim();

        if (!dataMap[warehouseSku]) {
          // Get stock for this variant
          const variantStock = stock.filter((s) => s.variantId === variant.id);
          const totalStock = variantStock.reduce((sum, s) => sum + s.available, 0);

          dataMap[warehouseSku] = {
            warehouseSku,
            productName: product.name,
            productId: product.id,
            variantId: variant.id,
            marketplacesSku: variant.sku,
            photo: product.photo,
            hargaModal: variant.price * 0.6, // 60% assumed as cost
            hargaJual: variant.price,
            totalStock,
            barcode: variant.barcode,
            marketplaceMappings: [],
          };
        }

        // Build marketplace mappings
        const marketplaceMap: Record<string, SkuMapping[]> = {};

        // Get mappings for this variant from all marketplaces
        Object.entries(allMappings).forEach(([key, mappings]) => {
          if (key.includes(variant.id)) {
            mappings.forEach((m) => {
              if (!marketplaceMap[m.marketplace]) {
                marketplaceMap[m.marketplace] = [];
              }
              marketplaceMap[m.marketplace].push(m);
            });
          }
        });

        dataMap[warehouseSku].marketplaceMappings = Object.entries(marketplaceMap).map(([marketplace, mappings]) => ({
          marketplace,
          count: mappings.length,
          mappings,
        }));
      });
    });

    return Object.values(dataMap);
  }, [allMappings]);

  // Apply filters and search
  const filteredData = useMemo(() => {
    return tableData.filter((item) => {
      // Search filter
      if (search) {
        const q = search.toLowerCase();
        if (
          !item.warehouseSku.toLowerCase().includes(q) &&
          !item.productName.toLowerCase().includes(q) &&
          !item.marketplacesSku?.toLowerCase().includes(q) &&
          !item.barcode?.toLowerCase().includes(q)
        ) {
          return false;
        }
      }

      // Status filter
      if (statusFilter !== "all") {
        const totalMappings = item.marketplaceMappings.reduce((sum, m) => sum + m.count, 0);
        if (statusFilter === "mapped" && totalMappings === 0) return false;
        if (statusFilter === "partial" && (totalMappings === 0 || totalMappings >= 3)) return false;
        if (statusFilter === "unmapped" && totalMappings > 0) return false;
      }

      // Marketplace filter
      if (marketplaceFilter !== "all") {
        const hasMarketplace = item.marketplaceMappings.some((m) => m.marketplace === marketplaceFilter);
        if (!hasMarketplace) return false;
      }

      return true;
    });
  }, [tableData, search, statusFilter, marketplaceFilter]);

  const handleAutoMapping = () => {
    console.log("Auto mapping triggered");
  };

  const handleAddMapping = () => {
    console.log("Add mapping triggered");
  };

  const handleMapping = (item: WarehouseSkuMapping) => {
    setSelectedItem(item);
    setDrawerOpen(true);
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Mapping SKU"
        subtitle="Hubungkan SKU gudang dengan SKU marketplace (Shopee, Tokopedia, TikTok, Lazada, dll)"
      />

      <Card className="p-4">
        <MappingToolbar
          search={search}
          onSearchChange={setSearch}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          marketplaceFilter={marketplaceFilter}
          onMarketplaceFilterChange={setMarketplaceFilter}
          onAutoMapping={handleAutoMapping}
          onAddMapping={handleAddMapping}
          isLoading={isLoadingMappings}
        />
      </Card>

      <MappingTable
        data={filteredData}
        isLoading={isLoadingMappings}
        onMapping={handleMapping}
        selectedRows={selectedRows}
        onSelectionChange={(id, checked) => {
          const newSelected = new Set(selectedRows);
          if (checked) {
            newSelected.add(id);
          } else {
            newSelected.delete(id);
          }
          setSelectedRows(newSelected);
        }}
      />

      <MappingDrawer
        isOpen={drawerOpen}
        onOpenChange={setDrawerOpen}
        item={selectedItem}
        allMappings={allMappings}
      />
    </div>
  );
}
