import { useState, useMemo, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Trash2, Search, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getAuthToken } from "@/lib/auth";
import type { WarehouseSkuMapping, SkuMapping } from "@/types/mapping";

interface DetailMappingModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  item: WarehouseSkuMapping | null;
  allMappings: Record<string, SkuMapping[]>;
  onSave?: () => Promise<void>;
}

export function DetailMappingModal({
  isOpen,
  onOpenChange,
  item,
  allMappings,
  onSave,
}: DetailMappingModalProps) {
  if (!item) return null;

  // State management
  const [selectedAvailable, setSelectedAvailable] = useState<Set<string>>(new Set());
  const [searchLeft, setSearchLeft] = useState("");
  const [filterMarketplaceLeft, setFilterMarketplaceLeft] = useState("all");
  const [filterStore, setFilterStore] = useState("all");
  const [selectedDisconnect, setSelectedDisconnect] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);

  // Track changes
  const [newlyAdded, setNewlyAdded] = useState<Set<number>>(new Set());
  const [newlyRemoved, setNewlyRemoved] = useState<Set<number>>(new Set());

  // Get all marketplace SKUs
  const allMarketplaceSKUs = useMemo(() => {
    return Object.values(allMappings).flat();
  }, [allMappings]);

  // Get initial connected SKU IDs (from item.marketplaceMappings)
  const initialConnectedIds = useMemo(() => {
    const ids = new Set<string>();
    item.marketplaceMappings.forEach((m) => {
      m.mappings.forEach((s) => {
        ids.add(s.id.toString());
      });
    });
    return ids;
  }, [item.marketplaceMappings]);

  // Get current connected IDs (including newly added, excluding newly removed)
  const currentConnectedIds = useMemo(() => {
    const ids = new Set(initialConnectedIds);
    // Remove newly removed
    newlyRemoved.forEach((id) => ids.delete(id.toString()));
    // Add newly added
    newlyAdded.forEach((id) => ids.add(id.toString()));
    return ids;
  }, [initialConnectedIds, newlyAdded, newlyRemoved]);

  // Extract store names from all marketplace SKUs
  const allStores = useMemo(() => {
    const stores = new Map<string, string>();
    stores.set("all", "Semua Toko");

    allMarketplaceSKUs.forEach((sku) => {
      // Try to extract store name from marketplace_variant_id
      // Format: "prd-{id}-{marketplace}-{color}-{size}" or similar
      const parts = sku.marketplace_variant_id?.split("-") || [];
      if (parts.length > 2) {
        const marketplace = parts[2];
        // For now, use marketplace as store identifier
        // In future, this could be enhanced with actual store names
        const storeKey = `${marketplace}`;
        if (!stores.has(storeKey)) {
          stores.set(storeKey, marketplace.charAt(0).toUpperCase() + marketplace.slice(1));
        }
      }
    });

    return Array.from(stores.entries()).map(([key, label]) => ({ value: key, label }));
  }, [allMarketplaceSKUs]);

  // Panel Kiri: Available (not connected)
  const availableSKUs = useMemo(() => {
    return allMarketplaceSKUs
      .filter((sku) => !currentConnectedIds.has(sku.id.toString()))
      .filter((sku) => {
        const matchSearch =
          sku.marketplace_sku.toLowerCase().includes(searchLeft.toLowerCase()) ||
          sku.product_name?.toLowerCase().includes(searchLeft.toLowerCase());
        const matchMarketplace =
          filterMarketplaceLeft === "all" || sku.marketplace === filterMarketplaceLeft;
        const matchStore =
          filterStore === "all" || sku.marketplace === filterStore;
        return matchSearch && matchMarketplace && matchStore;
      });
  }, [allMarketplaceSKUs, currentConnectedIds, searchLeft, filterMarketplaceLeft, filterStore]);

  // Panel Kanan: Connected (including newly added)
  const connectedSKUs = useMemo(() => {
    const skus: SkuMapping[] = [];

    // Add initially connected mappings (except newly removed)
    item.marketplaceMappings.forEach((m) => {
      m.mappings.forEach((s) => {
        if (!newlyRemoved.has(s.id)) {
          skus.push(s);
        }
      });
    });

    // Add newly added SKUs
    newlyAdded.forEach((skuId) => {
      const sku = allMarketplaceSKUs.find((s) => s.id === skuId);
      if (sku) {
        skus.push(sku);
      }
    });

    // Filter by store
    if (filterStore !== "all") {
      return skus.filter((sku) => sku.marketplace === filterStore);
    }

    return skus;
  }, [item.marketplaceMappings, newlyAdded, newlyRemoved, allMarketplaceSKUs, filterStore]);

  // Check if there are unsaved changes
  const hasChanges = newlyAdded.size > 0 || newlyRemoved.size > 0;

  const handleConnect = useCallback(() => {
    if (selectedAvailable.size === 0) return;

    const newAdded = new Set(newlyAdded);
    selectedAvailable.forEach((idStr) => {
      const id = parseInt(idStr, 10);
      newAdded.add(id);
    });
    setNewlyAdded(newAdded);

    // Remove from newly removed if it was there
    const newRemoved = new Set(newlyRemoved);
    selectedAvailable.forEach((idStr) => {
      const id = parseInt(idStr, 10);
      newRemoved.delete(id);
    });
    setNewlyRemoved(newRemoved);

    setSelectedAvailable(new Set());
  }, [selectedAvailable, newlyAdded, newlyRemoved]);

  const handleDisconnect = useCallback(() => {
    if (selectedDisconnect.size === 0) return;

    const newRemoved = new Set(newlyRemoved);
    const newAdded = new Set(newlyAdded);

    selectedDisconnect.forEach((idStr) => {
      const id = parseInt(idStr, 10);

      // If it was newly added, just remove from newlyAdded
      if (newAdded.has(id)) {
        newAdded.delete(id);
      } else if (initialConnectedIds.has(idStr)) {
        // If it was initially connected, mark as removed
        newRemoved.add(id);
      }
    });

    setNewlyAdded(newAdded);
    setNewlyRemoved(newRemoved);
    setSelectedDisconnect(new Set());
  }, [selectedDisconnect, newlyAdded, newlyRemoved, initialConnectedIds]);

  const handleSave = useCallback(async () => {
    if (!hasChanges) return;

    setIsSaving(true);
    try {
      const token = getAuthToken();
      if (!token) {
        console.error("No auth token");
        return;
      }

      // Get SKU objects for the changes
      const skusToAdd = Array.from(newlyAdded).map((id) =>
        allMarketplaceSKUs.find((s) => s.id === id)
      );
      const skuIdsToRemove = Array.from(newlyRemoved);

      // Call API to save changes
      await Promise.all([
        // Delete removed mappings
        ...skuIdsToRemove.map((id) =>
          fetch(`/api/sku-mappings/${id}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
          })
        ),
        // Create new mappings
        ...skusToAdd
          .filter(Boolean)
          .map((sku) =>
            fetch("/api/sku-mappings", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                marketplace_variant_id: sku!.marketplace_variant_id,
                marketplace: sku!.marketplace,
                marketplace_sku: sku!.marketplace_sku,
                warehouse_sku: item.warehouseSku,
                product_id: sku!.product_id,
                product_name: sku!.product_name,
                color: sku!.color,
                size: sku!.size,
              }),
            })
          ),
      ]);

      // Call parent callback to refresh data
      if (onSave) {
        await onSave();
      }

      // Show success toast
      toast.success("Mapping berhasil diperbarui");
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving mapping:", error);
      toast.error("Gagal menyimpan mapping. Silakan coba lagi.");
    } finally {
      setIsSaving(false);
    }
  }, [hasChanges, newlyAdded, newlyRemoved, allMarketplaceSKUs, item.warehouseSku, onSave, onOpenChange]);

  const handleCancel = useCallback(() => {
    // Reset all changes
    setNewlyAdded(new Set());
    setNewlyRemoved(new Set());
    setSelectedAvailable(new Set());
    setSelectedDisconnect(new Set());
    onOpenChange(false);
  }, [onOpenChange]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const marketplaces = [
    { value: "all", label: "Semua Marketplace" },
    { value: "shopee", label: "Shopee" },
    { value: "tokopedia", label: "Tokopedia" },
    { value: "tiktok", label: "TikTok Shop" },
    { value: "lazada", label: "Lazada" },
  ];

  const marketplaceColors: Record<string, string> = {
    shopee: "bg-red-100 text-red-800",
    tokopedia: "bg-green-100 text-green-800",
    tiktok: "bg-black text-white",
    lazada: "bg-blue-100 text-blue-800",
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl h-[90vh] max-h-[90vh] flex flex-col">
        <DialogHeader className="flex flex-row items-center justify-between">
          <div>
            <DialogTitle>Detail Mapping SKU Gudang</DialogTitle>
          </div>
          <select
            value={filterStore}
            onChange={(e) => setFilterStore(e.target.value)}
            className="px-3 py-2 text-sm border rounded-md bg-white"
          >
            {allStores.map((store) => (
              <option key={store.value} value={store.value}>
                {store.label}
              </option>
            ))}
          </select>
        </DialogHeader>

        <div className="flex-1 flex gap-4 overflow-hidden">
          {/* Panel Kiri: Available SKUs */}
          <div className="flex-1 flex flex-col border rounded-lg bg-white">
            <div className="p-4 border-b space-y-3">
              <h3 className="font-semibold text-sm">SKU Marketplace Tersedia</h3>

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari SKU atau produk..."
                  value={searchLeft}
                  onChange={(e) => setSearchLeft(e.target.value)}
                  className="pl-8 text-sm"
                />
              </div>

              {/* Filter Marketplace */}
              <select
                value={filterMarketplaceLeft}
                onChange={(e) => setFilterMarketplaceLeft(e.target.value)}
                className="w-full px-3 py-2 text-sm border rounded-md bg-white"
              >
                {marketplaces.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>

              <div className="text-xs text-muted-foreground">
                {availableSKUs.length} SKU tersedia
              </div>
            </div>

            {/* Available SKUs List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {availableSKUs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Tidak ada SKU marketplace tersedia
                </div>
              ) : (
                availableSKUs.map((sku) => (
                  <div
                    key={sku.id}
                    className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedAvailable.has(sku.id.toString())}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedAvailable(
                            new Set([...selectedAvailable, sku.id.toString()])
                          );
                        } else {
                          const newSet = new Set(selectedAvailable);
                          newSet.delete(sku.id.toString());
                          setSelectedAvailable(newSet);
                        }
                      }}
                      className="mt-1 cursor-pointer"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={marketplaceColors[sku.marketplace] || ""}>
                          {sku.marketplace}
                        </Badge>
                      </div>
                      <div className="font-mono font-semibold text-sm">{sku.marketplace_sku}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {sku.product_name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {[sku.color, sku.size].filter(Boolean).join(" / ")}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Panel Kanan: Connected SKUs */}
          <div className="flex-1 flex flex-col border rounded-lg bg-white">
            <div className="p-4 border-b space-y-3">
              <h3 className="font-semibold text-sm">Terhubung ke SKU Gudang</h3>

              {/* Info Card */}
              <Card className="p-3 bg-muted/30 border-0 space-y-2">
                <div>
                  <div className="text-xs text-muted-foreground">SKU Gudang</div>
                  <div className="font-mono font-semibold text-sm">{item.warehouseSku}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Nama Produk</div>
                  <div className="text-sm font-medium">{item.productName}</div>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                  <div>
                    <div className="text-xs text-muted-foreground">Harga Modal</div>
                    <div className="font-semibold text-sm">{formatCurrency(item.hargaModal)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Harga Jual</div>
                    <div className="font-semibold text-sm">{formatCurrency(item.hargaJual)}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-xs text-muted-foreground">Total Stok</div>
                    <div className="font-semibold text-sm">{item.totalStock} pcs</div>
                  </div>
                </div>
              </Card>

              <div className="text-xs text-muted-foreground">
                {connectedSKUs.length} SKU terhubung
              </div>
            </div>

            {/* Connected SKUs List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {connectedSKUs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Belum ada SKU marketplace terhubung
                </div>
              ) : (
                connectedSKUs.map((sku) => (
                  <div
                    key={sku.id}
                    className="flex items-start justify-between p-3 border rounded-lg bg-green-50/50 hover:bg-green-50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={marketplaceColors[sku.marketplace] || ""}>
                          {sku.marketplace}
                        </Badge>
                      </div>
                      <div className="font-mono font-semibold text-sm">{sku.marketplace_sku}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {sku.product_name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {[sku.color, sku.size].filter(Boolean).join(" / ")}
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={selectedDisconnect.has(sku.id.toString())}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedDisconnect(
                            new Set([...selectedDisconnect, sku.id.toString()])
                          );
                        } else {
                          const newSet = new Set(selectedDisconnect);
                          newSet.delete(sku.id.toString());
                          setSelectedDisconnect(newSet);
                        }
                      }}
                      className="mt-1 cursor-pointer"
                    />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="border-t pt-4 gap-2 justify-end">
          <Button variant="outline" onClick={handleCancel} disabled={isSaving}>
            Batal
          </Button>
          <Button
            variant="outline"
            onClick={handleDisconnect}
            disabled={selectedDisconnect.size === 0 || isSaving}
          >
            Lepas Mapping ({selectedDisconnect.size})
          </Button>
          <Button onClick={handleConnect} disabled={selectedAvailable.size === 0 || isSaving}>
            Hubungkan ({selectedAvailable.size})
          </Button>
          <Button onClick={handleSave} disabled={!hasChanges || isSaving}>
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Simpan
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
