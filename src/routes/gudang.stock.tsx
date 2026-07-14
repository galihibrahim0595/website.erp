import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Download, Upload, Plus, Edit2, Trash2, MoreVertical } from "lucide-react";
import { products, warehouses, stock } from "@/services/data";
import { warehouseSKUs } from "@/services/warehouse-master";
import { formatNumber } from "@/lib/format";
import type { WarehouseSKU } from "@/types/warehouse-master";

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

// ==================== Main Component ====================

function StockPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "normal" | "low" | "empty">("all");
  const [warehouseFilter, setWarehouseFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  // Aggregate warehouse SKU data with product info
  const skuRows = useMemo(() => {
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

    return rows;
  }, []);

  // Filter logic
  const filteredRows = useMemo(() => {
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

    // Warehouse filter
    if (warehouseFilter !== "all") {
      filtered = filtered.filter((r) => r.warehouseId === warehouseFilter);
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

    return filtered;
  }, [skuRows, search, statusFilter, warehouseFilter, categoryFilter]);

  // Calculate summary stats
  const summaryStats = useMemo(() => {
    let totalSKU = 0;
    let totalStock = 0;
    let totalValue = 0;

    filteredRows.forEach((row) => {
      totalSKU++;
      totalStock += row.totalStock;
      totalValue += row.totalStock * row.costPrice;
    });

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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="p-6 space-y-4">
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
              value={warehouseFilter}
              onChange={(e) => setWarehouseFilter(e.target.value)}
              className="px-3 py-2 text-sm border rounded-md bg-white"
            >
              <option value="all">Semua Gudang</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
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
          <Button variant="outline" size="sm">
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
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">
                  Gudang
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
                  <td colSpan={13} className="px-4 py-12 text-center text-muted-foreground">
                    Tidak ada data SKU
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => {
                  const available = row.totalStock - row.reservedStock;
                  const warehouse = warehouses.find((w) => w.id === row.warehouseId);

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
                      <td className="px-4 py-3 text-sm">{warehouse?.name || "-"}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <span className="font-mono text-sm">{formatCurrency(row.costPrice)}</span>
                          <button className="text-muted-foreground hover:text-foreground p-1">
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <span className="font-mono text-sm">{formatCurrency(row.sellingPrice)}</span>
                          <button className="text-muted-foreground hover:text-foreground p-1">
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
    </div>
  );
}
