import { FormEvent, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Trash2, X } from "lucide-react";
import { stockMovements, products, warehouses, createStockMovement, getWarehouseVariantStock } from "@/services/data";
import { formatNumber, formatDateTime } from "@/lib/format";
import type { StockMovement } from "@/types";

type VariantPickerItem = {
  variantId: string;
  productId: string;
  productName: string;
  thumbnail?: string;
  sku: string;
  barcode?: string;
  variationLabel: string;
  price: number;
  isUnique: boolean;
  warehouseStock: Record<string, number>;
};

type StockLine = {
  variantId: string;
  warehouseId: string;
  rackNumber: string;
  qty: number;
  price: number;
};

const pickerFilters = [
  { value: "all", label: "Semua" },
  { value: "single", label: "SKU Tunggal" },
  { value: "variation", label: "SKU Variasi" },
] as const;

export function MovementsPage({
  title, subtitle, type, ctaLabel,
}: { title: string; subtitle: string; type: StockMovement["type"]; ctaLabel: string }) {
  const [formOpen, setFormOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");
  const [pickerFilter, setPickerFilter] = useState<typeof pickerFilters[number]["value"]>("all");
  const [pickerSelection, setPickerSelection] = useState<string[]>([]);
  const [stockLines, setStockLines] = useState<StockLine[]>([]);
  const [massRack, setMassRack] = useState("");
  const [massQty, setMassQty] = useState(0);
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const handleUpdate = () => setRefreshKey((value) => value + 1);
    window.addEventListener("stock-updated", handleUpdate);
    return () => window.removeEventListener("stock-updated", handleUpdate);
  }, []);

  const variantItems = useMemo<VariantPickerItem[]>(() => {
    return products.flatMap((product) =>
      product.variants.map((variant) => {
        const warehouseStock: Record<string, number> = {};
        warehouses.forEach((warehouse) => {
          warehouseStock[warehouse.id] = getWarehouseVariantStock(warehouse.id, variant.id);
        });
        return {
          variantId: variant.id,
          productId: product.id,
          productName: product.name,
          thumbnail: product.photo,
          sku: variant.sku,
          barcode: variant.barcode,
          variationLabel: [variant.color, variant.size].filter(Boolean).join(" - ") || "SKU Tunggal",
          price: variant.price,
          isUnique: product.variants.length === 1,
          warehouseStock,
        };
      }),
    );
  }, []);

  const filteredPickerItems = useMemo(() => {
    const query = pickerSearch.trim().toLowerCase();
    return variantItems.filter((item) => {
      if (pickerFilter === "single" && !item.isUnique) return false;
      if (pickerFilter === "variation" && item.isUnique) return false;
      if (!query) return true;
      return (
        item.productName.toLowerCase().includes(query) ||
        item.sku.toLowerCase().includes(query) ||
        item.barcode?.toLowerCase().includes(query)
      );
    });
  }, [pickerSearch, pickerFilter, variantItems]);

  const selectedPickerItems = useMemo(
    () => variantItems.filter((item) => pickerSelection.includes(item.variantId)),
    [pickerSelection, variantItems],
  );

  const tableRows = useMemo(() => stockMovements.filter((movement) => movement.type === type), [type, refreshKey]);

  const findVariant = (variantId: string) => {
    for (const product of products) {
      const variant = product.variants.find((item) => item.id === variantId);
      if (variant) return { product, variant };
    }
    return null;
  };

  const addSelectedSkus = () => {
    setStockLines((prev) => {
      const next = [...prev];
      pickerSelection.forEach((variantId) => {
        if (!next.some((row) => row.variantId === variantId)) {
          const item = variantItems.find((variant) => variant.variantId === variantId);
          if (item) {
            next.push({ variantId, warehouseId: warehouses[0]?.id ?? "", rackNumber: "", qty: 0, price: item.price });
          }
        }
      });
      return next;
    });
    setPickerOpen(false);
    setPickerSelection([]);
    setPickerSearch("");
    setPickerFilter("all");
  };

  const applyMassRack = () => {
    if (!massRack) return;
    setStockLines((prev) => prev.map((line) => ({ ...line, rackNumber: massRack })));
  };

  const applyMassQty = () => {
    setStockLines((prev) => prev.map((line) => ({ ...line, qty: massQty })));
  };

  const removeLine = (variantId: string) => {
    setStockLines((prev) => prev.filter((line) => line.variantId !== variantId));
  };

  const setLineQty = (variantId: string, qty: number) => {
    setStockLines((prev) => prev.map((line) => line.variantId === variantId ? { ...line, qty } : line));
  };

  const setLineWarehouse = (variantId: string, warehouseId: string) => {
    setStockLines((prev) => prev.map((line) => line.variantId === variantId ? { ...line, warehouseId } : line));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (stockLines.length === 0) {
      setError("Pilih minimal satu SKU untuk dimasukkan.");
      return;
    }

    const invalidLine = stockLines.find((line) => line.qty <= 0);
    if (invalidLine) {
      setError("Semua baris harus memiliki Qty lebih besar dari 0.");
      return;
    }

    if (type === "out") {
      const overStock = stockLines.find((line) => {
        const available = getWarehouseVariantStock(line.warehouseId, line.variantId);
        return line.qty > available;
      });
      if (overStock) {
        setError("Beberapa baris memiliki Qty yang melebihi stock tersedia.");
        return;
      }
    }

    for (const line of stockLines) {
      const result = createStockMovement({
        type,
        variantId: line.variantId,
        warehouseId: line.warehouseId,
        qty: line.qty,
        note,
        reference: reference || undefined,
      });
      if (!result) {
        setError("Gagal menyimpan salah satu pergerakan stock.");
        return;
      }
    }

    setStockLines([]);
    setReference("");
    setNote("");
    setFormOpen(false);
    setRefreshKey((value) => value + 1);
  };

  return (
    <div className="p-6 space-y-4">
      <PageHeader
        title={title}
        subtitle={subtitle}
        actions={
          <Button size="sm" onClick={() => setFormOpen((value) => !value)}>
            <Plus className="h-3.5 w-3.5" /> {ctaLabel}
          </Button>
        }
      />

      {formOpen && (
        <Card className="space-y-4 p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold">{type === "in" ? "Form Tambah Stock Masuk" : "Form Tambah Stock Keluar"}</h2>
              <p className="text-sm text-muted-foreground">Pilih SKU, isi jumlah, lalu simpan pergerakan stock.</p>
            </div>
            <Button variant="outline" size="sm" type="button" onClick={() => setFormOpen(false)}>
              Tutup
            </Button>
          </div>

          <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-background p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <Label>Produk / Variasi</Label>
                    <p className="text-sm text-muted-foreground">Pilih SKU yang ingin ditambahkan ke Stock Masuk.</p>
                  </div>
                  <Button type="button" variant="outline" onClick={() => setPickerOpen((value) => !value)}>
                    {pickerOpen ? "Tutup Panel" : "Buka Panel"}
                  </Button>
                </div>

                {pickerOpen ? (
                  <div className="mt-4 space-y-4">
                    <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          className="pl-10"
                          value={pickerSearch}
                          onChange={(event) => setPickerSearch(event.target.value)}
                          placeholder="Cari produk, SKU, atau barcode..."
                        />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {pickerFilters.map((filter) => (
                          <Button
                            key={filter.value}
                            type="button"
                            size="sm"
                            variant={pickerFilter === filter.value ? "secondary" : "outline"}
                            onClick={() => setPickerFilter(filter.value)}
                          >
                            {filter.label}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-lg border border-border bg-background p-3">
                      {filteredPickerItems.length === 0 ? (
                        <div className="py-20 text-center text-sm text-muted-foreground">Tidak ada SKU yang cocok.</div>
                      ) : (
                        <div className="space-y-2">
                          {filteredPickerItems.map((item) => (
                            <label
                              key={item.variantId}
                              className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-3 hover:bg-muted"
                            >
                              <Checkbox
                                checked={pickerSelection.includes(item.variantId)}
                                onCheckedChange={(checked) => {
                                  setPickerSelection((prev) => {
                                    if (checked) {
                                      return prev.includes(item.variantId) ? prev : [...prev, item.variantId];
                                    }
                                    return prev.filter((id) => id !== item.variantId);
                                  });
                                }}
                              />
                              <div className="h-12 w-12 overflow-hidden rounded-md bg-muted">
                                {item.thumbnail ? <img src={item.thumbnail} alt={item.productName} className="h-full w-full object-cover" /> : null}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="font-medium truncate">{item.productName}</div>
                                <div className="text-xs text-muted-foreground">{item.variationLabel}</div>
                                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                  <span className="font-mono">{item.sku}</span>
                                  {item.barcode ? <span>· {item.barcode}</span> : null}
                                </div>
                              </div>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="rounded-lg border border-border bg-muted/80 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold">SKU Terpilih</div>
                          <div className="text-xs text-muted-foreground">{pickerSelection.length} item</div>
                        </div>
                        <Button type="button" variant="ghost" size="icon" onClick={() => setPickerSelection([])}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="mt-4 space-y-3">
                        {selectedPickerItems.length === 0 ? (
                          <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                            Pilih SKU di daftar sebelah kiri.
                          </div>
                        ) : (
                          selectedPickerItems.map((item) => (
                            <div key={item.variantId} className="flex items-center gap-3 rounded-lg border border-border bg-background p-3">
                              <div className="h-12 w-12 overflow-hidden rounded-md bg-muted">
                                {item.thumbnail ? <img src={item.thumbnail} alt={item.productName} className="h-full w-full object-cover" /> : null}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="font-medium truncate">{item.productName}</div>
                                <div className="text-xs text-muted-foreground">{item.variationLabel}</div>
                                <div className="mt-1 text-xs font-mono text-muted-foreground">{item.sku}</div>
                              </div>
                              <Button variant="ghost" size="icon" type="button" onClick={() => setPickerSelection((prev) => prev.filter((id) => id !== item.variantId))}>
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button type="button" onClick={addSelectedSkus} disabled={pickerSelection.length === 0}>
                        Konfirmasi
                      </Button>
                      <Button type="button" variant="outline" onClick={() => setPickerOpen(false)}>
                        Batal
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4 rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                    Klik tombol di atas untuk membuka panel Pilih SKU.
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid gap-3">
                <div>
                  <Label>Referensi</Label>
                  <Input value={reference} onChange={(event) => setReference(event.target.value)} placeholder="REF-1234 (opsional)" />
                </div>
                <div>
                  <Label>Catatan</Label>
                  <Textarea value={note} onChange={(event) => setNote(event.target.value)} className="h-24" placeholder="Masukkan catatan" />
                </div>
              </div>

              <div className="rounded-lg border border-border bg-background p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Edit Massal Nomor Rak</Label>
                    <div className="flex gap-2">
                      <Input value={massRack} onChange={(event) => setMassRack(event.target.value)} placeholder="Masukkan nomor rak" />
                      <Button type="button" onClick={applyMassRack}>Terapkan</Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Edit Massal Jumlah Penambahan Stock</Label>
                    <div className="flex gap-2">
                      <Input type="number" min={0} value={massQty || ""} onChange={(event) => setMassQty(Number(event.target.value))} placeholder="Masukkan qty" />
                      <Button type="button" onClick={applyMassQty}>Terapkan</Button>
                    </div>
                  </div>
                </div>
              </div>
              <form onSubmit={handleSubmit} className="space-y-4">
            {stockLines.length > 0 ? (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/60">
                    <tr className="text-left text-xs uppercase font-semibold text-muted-foreground">
                      <th className="px-4 py-3">Nomor SKU</th>
                      <th className="px-4 py-3">Judul</th>
                      <th className="px-4 py-3">Nomor Rak</th>
                      <th className="px-4 py-3">Area Gudang</th>
                      <th className="px-4 py-3 text-right">Stock Tersedia</th>
                      <th className="px-4 py-3 text-right">Jumlah Penambahan Stock</th>
                      <th className="px-4 py-3 text-right">Harga Satuan</th>
                      <th className="px-4 py-3">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stockLines.map((line) => {
                      const info = findVariant(line.variantId);
                      const selectedWarehouse = warehouses.find((warehouse) => warehouse.id === line.warehouseId);
                      const currentStock = getWarehouseVariantStock(line.warehouseId, line.variantId);
                      return (
                        <tr key={line.variantId} className="border-t border-border hover:bg-muted/30">
                          <td className="px-4 py-3 font-mono text-xs">{info?.variant.sku ?? "—"}</td>
                          <td className="px-4 py-3 font-medium">{info?.product.name ?? "—"}</td>
                          <td className="px-4 py-3">
                            <Input
                              value={line.rackNumber}
                              onChange={(event) => setStockLines((prev) => prev.map((item) => item.variantId === line.variantId ? { ...item, rackNumber: event.target.value } : item))}
                              placeholder="Nomor Rak"
                              className="h-9"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <select
                              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                              value={line.warehouseId}
                              onChange={(event) => setLineWarehouse(line.variantId, event.target.value)}
                            >
                              {warehouses.map((warehouse) => (
                                <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums">{formatNumber(currentStock)}</td>
                          <td className="px-4 py-3 text-right">
                            <Input
                              type="number"
                              min={0}
                              value={line.qty || ""}
                              onChange={(event) => setLineQty(line.variantId, Number(event.target.value))}
                              className="h-9 w-24 text-right"
                            />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Input
                              type="number"
                              min={0}
                              value={line.price || ""}
                              onChange={(event) => setStockLines((prev) => prev.map((item) => item.variantId === line.variantId ? { ...item, price: Number(event.target.value) } : item))}
                              className="h-9 w-28 text-right"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <Button size="icon" variant="ghost" type="button" onClick={() => removeLine(line.variantId)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rounded-lg border border-border bg-muted/60 p-6 text-center text-sm text-muted-foreground">
                Pilih SKU terlebih dahulu untuk melihat baris Stock Masuk.
              </div>
            )}

            {error && <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>}

            <div className="flex flex-wrap items-center gap-2">
              <Button type="submit">Simpan Pergerakan</Button>
              <Button variant="outline" type="button" onClick={() => setFormOpen(false)}>Batal</Button>
            </div>
          </form>
        </div>
      </div>
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/60">
              <tr className="text-left text-xs uppercase font-semibold text-muted-foreground">
                <th className="px-4 py-3">Referensi</th>
                <th className="px-4 py-3">Produk</th>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Gudang</th>
                <th className="px-4 py-3 text-right">Qty</th>
                <th className="px-4 py-3">Catatan</th>
                <th className="px-4 py-3">Tanggal</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.length === 0 && <tr><td colSpan={7} className="text-center py-14 text-muted-foreground">Belum ada data.</td></tr>}
              {tableRows.map((m) => {
                const info = findVariant(m.variantId);
                const wh = warehouses.find((w) => w.id === m.warehouseId);
                return (
                  <tr key={m.id} className="border-t border-border hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-primary">{m.reference}</td>
                    <td className="px-4 py-3 font-medium">{info?.product.name ?? "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs">{info?.variant.sku}</td>
                    <td className="px-4 py-3 text-xs">{wh?.name}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold">
                      <Badge variant="outline" className={
                        type === "in" ? "bg-success/10 text-success border-success/30" :
                        type === "out" ? "bg-destructive/10 text-destructive border-destructive/30" :
                        "bg-warning/10 text-warning border-warning/30"
                      }>{type === "out" ? "-" : "+"}{formatNumber(m.qty)}</Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-[220px] truncate">{m.note}</td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap">{formatDateTime(m.createdAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
