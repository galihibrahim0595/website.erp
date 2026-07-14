import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Download, Upload, Plus, Edit2, Trash2, MoreVertical, Loader2 } from "lucide-react";
import { products, warehouses, stock } from "@/services/data";
import { warehouseSKUs, updateWarehouseSKU } from "@/services/warehouse-master";
import { formatNumber } from "@/lib/format";
import { getAuthHeaders } from "@/lib/auth";
import { toast } from "sonner";
import type { WarehouseSKU } from "@/types/warehouse-master";

type BackendWarehouseSkuRow = {
  id: number | string;
  warehouse_id: string;
  sku_code: string;
  product_name: string;
  color?: string | null;
  size?: string | null;
  cost_price: number;
  selling_price: number;
  total_stock: number;
  reserved_stock: number;
  weight_gram?: number | null;
  dimension_length?: number | null;
  dimension_width?: number | null;
  dimension_height?: number | null;
  barcode?: string | null;
  variant_id?: string | null;
  created_at: string;
  updated_at: string;
};

export const Route = createFileRoute("/gudang/stock")({
  head: () => ({ meta: [{ title: "Stock Gudang — NovaOMS" }] }),
  component: StockPage,
});

// ==================== Helper Components ====================

function StockStatusBadge({ available, total }: { available: number; total: number }) {
  if (total === 0) {
    return <Badge className="bg-red-100 text-red-800 border-red-300">Habis</Badge>;
  }
  const percentage = (available / total) * 100;
  if (percentage === 0) {
    return <Badge className="bg-red-100 text-red-800 border-red-300">Habis</Badge>;
  }
  if (percentage <= 20) {
    return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">Rendah</Badge>;
  }
  return <Badge className="bg-green-100 text-green-800 border-green-300">Normal</Badge>;
}

function CategoryBadge({ category }: { category?: string }) {
  if (!category) return null;
  const colors: Record<string, string> = {
    "Fashion Pria": "bg-blue-100 text-blue-800",
    "Fashion Wanita": "bg-pink-100 text-pink-800",
    "Aksesoris": "bg-purple-100 text-purple-800",
    "Elektronik": "bg-orange-100 text-orange-800",
    "Rumah Tangga": "bg-cyan-100 text-cyan-800",
  };
  return (
    <Badge className={colors[category] || "bg-gray-100 text-gray-800"}>
      {category}
    </Badge>
  );
}

// ==================== Helper: Format Currency ====================

function formatCurrency(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(value);
}

// ==================== Modal: Update Harga Modal Bulk ====================

interface UpdateHargaModalBulkProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedSkuIds: Set<string>;
  skuRows: (WarehouseSKU & { category?: string; productInfo?: any })[];
  onSave: (updates: { skuId: string; newCostPrice: number }[]) => Promise<void>;
}

function UpdateHargaModalBulkModal({
  open,
  onOpenChange,
  selectedSkuIds,
  skuRows,
  onSave,
}: UpdateHargaModalBulkProps) {
  const [method, setMethod] = useState<"set" | "add" | "subtract" | "addPercent" | "subtractPercent">("set");
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);

  const selectedSkus = useMemo(
    () => skuRows.filter((r) => selectedSkuIds.has(r.id)),
    [skuRows, selectedSkuIds]
  );

  const preview = useMemo(() => {
    if (!inputValue) return selectedSkus.map((sku) => ({ id: sku.id, old: sku.costPrice, new: sku.costPrice }));

    const value = parseFloat(inputValue) || 0;
    return selectedSkus.map((sku) => {
      let newPrice = sku.costPrice;
      if (method === "set") newPrice = value;
      else if (method === "add") newPrice = sku.costPrice + value;
      else if (method === "subtract") newPrice = Math.max(0, sku.costPrice - value);
      else if (method === "addPercent") newPrice = sku.costPrice * (1 + value / 100);
      else if (method === "subtractPercent") newPrice = sku.costPrice * (1 - value / 100);

      return { id: sku.id, old: sku.costPrice, new: Math.round(newPrice) };
    });
  }, [selectedSkus, method, inputValue]);

  const handleSave = async () => {
    if (!inputValue) {
      toast.error("Masukkan nilai update");
      return;
    }

    console.log(`[MODAL] Save clicked, method=${method}, value=${inputValue}`);
    setLoading(true);
    
    try {
      const updates = preview.map((p) => ({ skuId: p.id, newCostPrice: p.new }));
      console.log(`[MODAL] ${updates.length} updates prepared`);
      
      // Fire and forget - close modal immediately
      console.log(`[MODAL] Starting async sync (fire-and-forget)`);
      const syncPromise = onSave(updates);
      
      // Close modal immediately
      console.log(`[MODAL] Closing modal immediately`);
      onOpenChange(false);
      setInputValue("");
      setMethod("set");
      
      // Handle result in background
      syncPromise
        .then(() => {
          console.log(`[MODAL] Sync completed`);
          toast.success(`Harga modal ${updates.length} SKU berhasil diperbarui`);
        })
        .catch((error) => {
          console.error(`[MODAL] Sync failed:`, error);
          const errorMsg = error instanceof Error ? error.message : String(error);
          toast.error(`Gagal memperbarui harga modal: ${errorMsg}`);
        });
    } finally {
      console.log(`[MODAL] Setting loading to false`);
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Update Harga Modal</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* SKU Count */}
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-900">
              <span className="font-semibold">{selectedSkus.length}</span> SKU dipilih
            </p>
          </div>

          {/* Method Selection */}
          <div className="space-y-2">
            <Label className="text-base font-semibold">Metode Update</Label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: "set", label: "Ganti menjadi nominal" },
                { value: "add", label: "Tambah nominal" },
                { value: "subtract", label: "Kurangi nominal" },
                { value: "addPercent", label: "Tambah persentase (%)" },
                { value: "subtractPercent", label: "Kurangi persentase (%)" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setMethod(opt.value as any)}
                  className={`p-3 text-left border rounded-lg transition-colors ${
                    method === opt.value
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="text-sm font-medium">{opt.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Input Value */}
          <div className="space-y-2">
            <Label htmlFor="update-value">
              {method === "addPercent" || method === "subtractPercent" ? "Persentase (%)" : "Nominal (Rp)"}
            </Label>
            <Input
              id="update-value"
              type="number"
              placeholder={method === "addPercent" || method === "subtractPercent" ? "Contoh: 10" : "Contoh: 50000"}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
            />
          </div>

          {/* Preview */}
          <div className="space-y-2">
            <Label className="text-base font-semibold">Preview Perubahan</Label>
            <div className="max-h-48 overflow-y-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left">SKU</th>
                    <th className="px-3 py-2 text-right">Harga Lama</th>
                    <th className="px-3 py-2 text-center">→</th>
                    <th className="px-3 py-2 text-right">Harga Baru</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((p) => {
                    const sku = selectedSkus.find((s) => s.id === p.id);
                    return (
                      <tr key={p.id} className="border-t">
                        <td className="px-3 py-2">{sku?.skuCode}</td>
                        <td className="px-3 py-2 text-right font-mono text-xs">
                          {formatCurrency(p.old)}
                        </td>
                        <td className="px-3 py-2 text-center text-muted-foreground">→</td>
                        <td className="px-3 py-2 text-right font-mono font-semibold text-xs">
                          {formatCurrency(p.new)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Batal
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ==================== Modal: Edit Harga Individual ====================

interface EditHargaIndividualProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sku: (WarehouseSKU & { category?: string; productInfo?: any }) | null;
  type: "modal" | "jual";
  onSave: (newPrice: number) => Promise<void>;
}

function EditHargaIndividualModal({
  open,
  onOpenChange,
  sku,
  type,
  onSave,
}: EditHargaIndividualProps) {
  const [newPrice, setNewPrice] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && sku) {
      setNewPrice(type === "modal" ? String(sku.costPrice) : String(sku.sellingPrice));
    }
  }, [open, sku, type]);

  if (!sku) return null;

  const oldPrice = type === "modal" ? sku.costPrice : sku.sellingPrice;
  const title = type === "modal" ? "Edit Harga Modal" : "Edit Harga Jual";

  const handleSave = async () => {
    if (!newPrice) {
      toast.error("Masukkan harga baru");
      return;
    }

    const price = parseFloat(newPrice);
    if (isNaN(price) || price < 0) {
      toast.error("Harga harus berupa angka positif");
      return;
    }

    console.log(`[EDIT] Save clicked, type=${type}, price=${price}`);
    setLoading(true);
    
    try {
      // Fire and forget - close modal immediately
      console.log(`[EDIT] Starting async sync (fire-and-forget)`);
      const syncPromise = onSave(price);
      
      // Close modal immediately
      console.log(`[EDIT] Closing modal immediately`);
      onOpenChange(false);
      
      // Handle result in background
      syncPromise
        .then(() => {
          console.log(`[EDIT] Sync completed`);
          toast.success(`Harga ${type === "modal" ? "modal" : "jual"} SKU berhasil diperbarui`);
        })
        .catch((error) => {
          console.error(`[EDIT] Sync failed:`, error);
          const errorMsg = error instanceof Error ? error.message : String(error);
          toast.error(`Gagal memperbarui harga ${type === "modal" ? "modal" : "jual"}: ${errorMsg}`);
        });
    } finally {
      console.log(`[EDIT] Setting loading to false`);
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* SKU Info */}
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-muted-foreground">SKU</p>
            <p className="text-sm font-medium">{sku.skuCode}</p>
          </div>

          {/* Old Price */}
          <div>
            <Label className="text-xs">Harga Lama</Label>
            <div className="text-2xl font-bold mt-1">{formatCurrency(oldPrice)}</div>
          </div>

          {/* New Price Input */}
          <div className="space-y-2">
            <Label htmlFor="new-price">Harga Baru (Rp)</Label>
            <Input
              id="new-price"
              type="number"
              placeholder="Masukkan harga baru"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              disabled={loading}
            />
          </div>

          {/* New Price Preview */}
          {newPrice && !isNaN(parseFloat(newPrice)) && (
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-900 mb-1">Harga Baru</p>
              <p className="text-2xl font-bold text-blue-900">{formatCurrency(parseFloat(newPrice))}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Batal
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ==================== Main Component ====================

function StockPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "normal" | "low" | "empty">("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  // Modal state
  const [showUpdateHargaModalBulk, setShowUpdateHargaModalBulk] = useState(false);
  const [showEditHargaIndividual, setShowEditHargaIndividual] = useState(false);
  const [editingHargaType, setEditingHargaType] = useState<"modal" | "jual">("modal");
  const [editingHargaSku, setEditingHargaSku] = useState<(WarehouseSKU & { category?: string; productInfo?: any }) | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Sync tracking - using timestamp to guarantee re-render
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);

  useEffect(() => {
    const loadWarehouseSkusFromApi = async () => {
      try {
        const response = await fetch("/api/warehouse-skus", {
          headers: {
            ...getAuthHeaders(),
          },
        });

        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload?.error || "Gagal mengambil warehouse SKU");
        }

        const rows = (payload?.data ?? []) as BackendWarehouseSkuRow[];
        const mappedRows: WarehouseSKU[] = rows.map((row) => ({
          id: String(row.id),
          warehouseId: row.warehouse_id,
          skuCode: row.sku_code,
          productName: row.product_name,
          color: row.color ?? undefined,
          size: row.size ?? undefined,
          costPrice: Number(row.cost_price),
          sellingPrice: Number(row.selling_price),
          totalStock: Number(row.total_stock),
          reservedStock: Number(row.reserved_stock),
          weightGram: row.weight_gram ?? undefined,
          dimensions:
            row.dimension_length != null && row.dimension_width != null && row.dimension_height != null
              ? {
                  length: Number(row.dimension_length),
                  width: Number(row.dimension_width),
                  height: Number(row.dimension_height),
                }
              : undefined,
          barcode: row.barcode ?? undefined,
          variantId: row.variant_id ?? undefined,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }));

        warehouseSKUs.splice(0, warehouseSKUs.length, ...mappedRows);
        console.log("[GET /api/warehouse-skus] IDs:", mappedRows.map((sku) => sku.id));
        setLastSyncTime(Date.now());
        setRefreshKey((k) => k + 1);
      } catch (error) {
        console.error("[GET /api/warehouse-skus] Error:", error);
      }
    };

    void loadWarehouseSkusFromApi();
  }, []);

  // Aggregate warehouse SKU data with product info
  // Depend on lastSyncTime to guarantee re-render after sync completes
  const skuRows = useMemo(() => {
    console.log(`[SKUROWS] Recomputing skuRows, lastSyncTime=${lastSyncTime}, refreshKey=${refreshKey}, warehouseSKUs.length=${warehouseSKUs.length}`);
    const rows: (WarehouseSKU & { category?: string; productInfo?: any })[] = [];

    warehouseSKUs.forEach((wsku) => {
      // Find related product
      const product = products.find((p) => p.id === wsku.variantId?.split("-")[0]);
      
      rows.push({
        ...wsku,
        category: product?.category,
        productInfo: product,
      });
    });

    console.log(`[SKUROWS] Recomputed ${rows.length} rows:`, rows.slice(0, 2));
    return rows;
  }, [lastSyncTime, refreshKey, warehouseSKUs, products]);

  // Filter logic
  const filteredRows = useMemo(() => {
    console.log(`[FILTER] Recomputing filteredRows, skuRows.length=${skuRows.length}`);
    let filtered = [...skuRows];

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.skuCode.toLowerCase().includes(q) ||
          r.productName.toLowerCase().includes(q) ||
          r.barcode?.toLowerCase().includes(q)
      );
    }

    // Category filter
    if (categoryFilter !== "all") {
      filtered = filtered.filter((r) => r.category === categoryFilter);
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((r) => {
        const available = r.totalStock - r.reservedStock;
        const percentage = (available / r.totalStock) * 100;

        if (statusFilter === "empty") return percentage === 0;
        if (statusFilter === "low") return percentage > 0 && percentage <= 20;
        if (statusFilter === "normal") return percentage > 20;
        return true;
      });
    }

    console.log(`[FILTER] ✓ Filtered to ${filtered.length} rows`);
    return filtered;
  }, [skuRows, search, statusFilter, categoryFilter]);

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    console.log(`[SUMMARY] Recalculating summary stats, filteredRows.length=${filteredRows.length}`);
    let totalSKU = 0;
    let totalStock = 0;
    let totalValue = 0;

    filteredRows.forEach((row) => {
      totalSKU++;
      totalStock += row.totalStock;
      totalValue += row.totalStock * row.costPrice;
    });

    console.log(`[SUMMARY] ✓ Summary: ${totalSKU} SKU, ${totalStock} stock, ${totalValue} value`);
    return { totalSKU, totalStock, totalValue };
  }, [filteredRows]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedRows(new Set(filteredRows.map((r) => r.id)));
    } else {
      setSelectedRows(new Set());
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    const newSet = new Set(selectedRows);
    if (checked) {
      newSet.add(id);
    } else {
      newSet.delete(id);
    }
    setSelectedRows(newSet);
  };

  // ===== Sync Functions =====

  /**
   * Synchronize warehouse SKU pricing updates to:
   * - Mapping SKU page
   * - Products page
   * - Marketplace pages (if connected)
   */
  const syncPricingChanges = async (skuId: string, newCostPrice?: number, newSellingPrice?: number) => {
    try {
      // Find SKU in memory
      const sku = warehouseSKUs.find((s) => s.id === skuId);
      if (!sku) {
        throw new Error(`SKU not found in memory: ${skuId}`);
      }

      console.log(`[SYNC] Syncing SKU "${sku.skuCode}"`);
      
      // Store old values for rollback if needed
      const oldCostPrice = sku.costPrice;
      const oldSellingPrice = sku.sellingPrice;

      // Optimistic update - update in-memory immediately
      if (newCostPrice !== undefined) {
        sku.costPrice = newCostPrice;
      }
      if (newSellingPrice !== undefined) {
        sku.sellingPrice = newSellingPrice;
      }

      // Trigger re-render immediately (no waiting)
      setLastSyncTime(Date.now());
      setRefreshKey((k) => k + 1);
      console.log(`[SYNC] In-memory updated, React re-render triggered`);

      // Prepare API payload
      const payload: any = {};
      if (newCostPrice !== undefined) {
        payload.cost_price = newCostPrice;
      }
      if (newSellingPrice !== undefined) {
        payload.selling_price = newSellingPrice;
      }

      let updateId = sku.id;
      const looksLikeSyntheticId = /^wsku-|^fallback-|^dummy-/i.test(updateId);

      // If local ID is synthetic, resolve the real DB ID from backend data.
      if (looksLikeSyntheticId) {
        const idLookupResponse = await fetch("/api/warehouse-skus", {
          headers: {
            ...getAuthHeaders(),
          },
        });

        const idLookupPayload = await idLookupResponse.json();
        if (!idLookupResponse.ok) {
          throw new Error(idLookupPayload?.error || "Gagal mengambil warehouse SKU untuk resolve ID");
        }

        const backendRows = (idLookupPayload?.data ?? []) as BackendWarehouseSkuRow[];
        const backendRow = backendRows.find(
          (row) => row.warehouse_id === sku.warehouseId && row.sku_code === sku.skuCode,
        );

        if (!backendRow) {
          throw new Error(`Backend SKU tidak ditemukan untuk ${sku.skuCode}`);
        }

        updateId = String(backendRow.id);
      }

      // Call API (fire-and-forget style - errors are caught)
      console.log("Update ID:", sku.id);
      const response = await fetch(`/api/warehouse-skus/${updateId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify(payload),
      });

      const responseData = await response.json();

      if (!response.ok) {
        // Rollback on API error
        console.log(`[SYNC] API error, rolling back SKU "${sku.skuCode}"`);
        sku.costPrice = oldCostPrice;
        sku.sellingPrice = oldSellingPrice;
        setLastSyncTime(Date.now()); // Trigger re-render with rolled back values
        setRefreshKey((k) => k + 1);
        throw new Error(`API error: ${response.status} - ${responseData.error || "Unknown error"}`);
      }

      console.log(`[SYNC] ✓ SKU "${sku.skuCode}" synced successfully`);
    } catch (error) {
      console.error(`[SYNC] Error for SKU ${skuId}:`, error);
      throw error;
    }
  };

  // ===== Handler Functions =====

  const handleUpdateHargaModalClick = () => {
    if (selectedRows.size === 0) {
      toast.error("Pilih minimal 1 SKU");
      return;
    }
    setShowUpdateHargaModalBulk(true);
  };

  const handleUpdateHargaModalBulkSave = async (updates: { skuId: string; newCostPrice: number }[]) => {
    try {
      console.log(`[BULK] Starting ${updates.length} parallel syncs`);
      
      // Use Promise.all for parallel execution instead of sequential
      const syncPromises = updates.map((update) => {
        console.log(`[BULK] Queueing ${update.skuId}`);
        return syncPricingChanges(update.skuId, update.newCostPrice);
      });
      
      await Promise.all(syncPromises);
      
      console.log(`[BULK] Clearing selection`);
      setSelectedRows(new Set());
      
      console.log(`[BULK] All syncs completed`);
    } catch (error) {
      console.error(`[BULK] ERROR:`, error);
      throw error;
    }
  };

  const handleEditHargaModalClick = (sku: WarehouseSKU & { category?: string; productInfo?: any }) => {
    setEditingHargaSku(sku);
    setEditingHargaType("modal");
    setShowEditHargaIndividual(true);
  };

  const handleEditHargaJualClick = (sku: WarehouseSKU & { category?: string; productInfo?: any }) => {
    setEditingHargaSku(sku);
    setEditingHargaType("jual");
    setShowEditHargaIndividual(true);
  };

  const handleEditHargaIndividualSave = async (newPrice: number) => {
    if (!editingHargaSku) return;

    try {
      console.log(`[HANDLER] Starting edit save for SKU ${editingHargaSku.id}, type=${editingHargaType}`);
      if (editingHargaType === "modal") {
        await syncPricingChanges(editingHargaSku.id, newPrice);
      } else {
        await syncPricingChanges(editingHargaSku.id, undefined, newPrice);
      }
      console.log(`[HANDLER] Edit save completed`);
    } catch (error) {
      console.error(`[HANDLER] ERROR:`, error);
      throw error;
    }
  };

  return (
    <div className="p-6 space-y-4">
      {(() => {
        console.log(`[RENDER] StockPage rendering, filteredRows.length=${filteredRows.length}, summaryStats=`, summaryStats);
        return null;
      })()}
      
      {/* Header */}
      <PageHeader
        title="Stock Gudang"
        subtitle="Master data inventory — sumber kebenaran untuk semua halaman"
      />

      {/* Filters */}
      <Card className="p-4 space-y-4">
        <div className="grid gap-3">
          {/* Search and basic filters */}
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari SKU, nama produk, atau barcode..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 text-sm border rounded-md bg-white"
            >
              <option value="all">Semua Status</option>
              <option value="normal">Normal</option>
              <option value="low">Rendah</option>
              <option value="empty">Habis</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 text-sm border rounded-md bg-white"
            >
              <option value="all">Semua Kategori</option>
              {["Fashion Pria", "Fashion Wanita", "Aksesoris", "Elektronik", "Rumah Tangga"].map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Toolbar and Summary */}
      <div className="flex gap-4 flex-col md:flex-row md:items-center justify-between">
        {/* Toolbar - Left */}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={selectedRows.size === 0}>
            Aksi Massal ({selectedRows.size})
          </Button>
          <Button variant="outline" size="sm" onClick={handleUpdateHargaModalClick}>
            Update Harga Modal
          </Button>
        </div>

        {/* Toolbar - Right */}
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <Upload className="h-4 w-4 mr-1" />
            Import
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Tambah SKU
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground mb-1">Total SKU</div>
          <div className="text-3xl font-bold">{formatNumber(summaryStats.totalSKU)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground mb-1">Total Stock</div>
          <div className="text-3xl font-bold">{formatNumber(summaryStats.totalStock)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground mb-1">Total Nilai Persediaan</div>
          <div className="text-3xl font-bold">{formatCurrency(summaryStats.totalValue)}</div>
        </Card>
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-muted/60 backdrop-blur border-b">
              <tr>
                <th className="px-4 py-3 text-left w-10">
                  <input
                    type="checkbox"
                    checked={selectedRows.size === filteredRows.length && filteredRows.length > 0}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">
                  Foto
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">
                  SKU Gudang
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">
                  Nama SKU
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">
                  Variasi
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-muted-foreground">
                  Harga Modal
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-muted-foreground">
                  Harga Jual
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-muted-foreground">
                  Reserved
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-muted-foreground">
                  Available
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-muted-foreground">
                  Total Stock
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-muted-foreground">
                  Status
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-muted-foreground">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-12 text-center text-muted-foreground">
                    Tidak ada data SKU
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => {
                  const available = row.totalStock - row.reservedStock;
                  
                  if (row.skuCode?.includes("001")) {  // Only log first SKU
                    console.log(`[TABLE] Rendering row: SKU=${row.skuCode}, costPrice=${row.costPrice}, sellingPrice=${row.sellingPrice}`);
                  }

                  return (
                    <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedRows.has(row.id)}
                          onChange={(e) => handleSelectRow(row.id, e.target.checked)}
                          className="rounded"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="h-10 w-10 rounded bg-muted flex items-center justify-center text-xs">
                          IMG
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-mono font-semibold text-sm">{row.skuCode}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="max-w-[200px]">
                          <div className="font-medium text-sm">{row.productName}</div>
                          {row.category && <CategoryBadge category={row.category} />}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          {row.color && (
                            <Badge variant="secondary" className="text-xs">
                              {row.color}
                            </Badge>
                          )}
                          {row.size && (
                            <Badge variant="secondary" className="text-xs">
                              {row.size}
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <span className="font-mono text-sm">{formatCurrency(row.costPrice)}</span>
                          <button 
                            onClick={() => handleEditHargaModalClick(row)}
                            className="text-muted-foreground hover:text-foreground p-1 transition-colors"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <span className="font-mono text-sm">{formatCurrency(row.sellingPrice)}</span>
                          <button 
                            onClick={() => handleEditHargaJualClick(row)}
                            className="text-muted-foreground hover:text-foreground p-1 transition-colors"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-mono">{formatNumber(row.reservedStock)}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-mono font-semibold">{formatNumber(available)}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-mono font-bold">{formatNumber(row.totalStock)}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <StockStatusBadge available={available} total={row.totalStock} />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button className="text-muted-foreground hover:text-foreground">
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modals */}
      <UpdateHargaModalBulkModal
        open={showUpdateHargaModalBulk}
        onOpenChange={setShowUpdateHargaModalBulk}
        selectedSkuIds={selectedRows}
        skuRows={skuRows}
        onSave={handleUpdateHargaModalBulkSave}
      />

      <EditHargaIndividualModal
        open={showEditHargaIndividual}
        onOpenChange={setShowEditHargaIndividual}
        sku={editingHargaSku}
        type={editingHargaType}
        onSave={handleEditHargaIndividualSave}
      />
    </div>
  );
}
