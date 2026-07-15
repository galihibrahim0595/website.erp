import { getAuthHeaders, getAuthUserId } from "@/lib/auth";
import { ensureWarehouseSKUsLoaded, warehouseSKUs } from "@/services/warehouse-master";
import type { StockMovement } from "@/types";
import type { WarehouseSKU } from "@/types/warehouse-master";

type UpdateStockPayload = {
  skuGudang: string;
  newStock: number;
  userId: number;
  timestamp: string;
  warehouseId?: string;
};

type UpdateHargaModalPayload = {
  skuGudang: string;
  hargaLama: number;
  hargaBaru: number;
  metodeUpdate: string;
  userId: number;
  timestamp: string;
  warehouseId?: string;
};

type BackendWarehouseStockResponse = {
  success?: boolean;
  data?: unknown[];
  error?: string;
};

function getWarehouseRows() {
  return warehouseSKUs;
}

function findRowsBySkuCode(skuCode: string, warehouseId?: string) {
  return getWarehouseRows().filter((row) => row.skuCode === skuCode && (!warehouseId || row.warehouseId === warehouseId));
}

export async function ensureGlobalStockLoaded(force = false): Promise<WarehouseSKU[]> {
  await ensureWarehouseSKUsLoaded(force);
  return getWarehouseRows();
}

export function getGlobalWarehouseRows(): WarehouseSKU[] {
  return getWarehouseRows();
}

export function getGlobalWarehouseRowByVariantId(variantId: string, warehouseId?: string) {
  return getWarehouseRows().find((row) => row.variantId === variantId && (!warehouseId || row.warehouseId === warehouseId));
}

export function getGlobalWarehouseRowBySkuCode(skuCode: string, warehouseId?: string) {
  return getWarehouseRows().find((row) => row.skuCode === skuCode && (!warehouseId || row.warehouseId === warehouseId));
}

export function getGlobalWarehouseVariantStock(variantId: string, warehouseId?: string): number {
  const rows = getWarehouseRows().filter((row) => row.variantId === variantId && (!warehouseId || row.warehouseId === warehouseId));
  return rows.reduce((sum, row) => sum + Math.max(0, row.totalStock - row.reservedStock), 0);
}

export function getGlobalWarehouseStockBySkuCode(skuCode: string, warehouseId?: string): number {
  const rows = findRowsBySkuCode(skuCode, warehouseId);
  return rows.reduce((sum, row) => sum + Math.max(0, row.totalStock - row.reservedStock), 0);
}

export async function updateGlobalWarehouseStock(payload: UpdateStockPayload): Promise<WarehouseSKU[]> {
  const userId = getAuthUserId() ?? payload.userId;
  if (!Number.isFinite(payload.newStock) || payload.newStock < 0) {
    throw new Error("Stock tidak boleh negatif dan harus berupa angka");
  }

  console.log("[GLOBAL_STOCK] updating stock", payload);

  const response = await fetch("/warehouse/stock/update", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify({
      sku_gudang: payload.skuGudang,
      new_stock: payload.newStock,
      user_id: userId,
      timestamp: payload.timestamp,
      warehouse_id: payload.warehouseId,
    }),
  });

  const data = (await response.json()) as BackendWarehouseStockResponse;
  if (!response.ok) {
    console.error("[GLOBAL_STOCK] stock update failed", data);
    throw new Error(data.error || "Gagal memperbarui stock gudang");
  }

  console.log("[GLOBAL_STOCK] stock update succeeded", data);
  await ensureWarehouseSKUsLoaded(true);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("stock-updated"));
  }
  return getWarehouseRows();
}

export async function updateGlobalHargaModal(payload: UpdateHargaModalPayload): Promise<WarehouseSKU[]> {
  const userId = getAuthUserId() ?? payload.userId;
  if (!Number.isFinite(payload.hargaBaru) || payload.hargaBaru < 0) {
    throw new Error("Harga modal harus berupa angka dan tidak boleh negatif");
  }

  console.log("[GLOBAL_STOCK] updating harga modal", payload);

  const response = await fetch("/warehouse/harga-modal/update", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...getAuthHeaders(),
    },
    body: JSON.stringify({
      sku_gudang: payload.skuGudang,
      harga_lama: payload.hargaLama,
      harga_baru: payload.hargaBaru,
      metode_update: payload.metodeUpdate,
      user_id: userId,
      timestamp: payload.timestamp,
      warehouse_id: payload.warehouseId,
    }),
  });

  const data = (await response.json()) as BackendWarehouseStockResponse;
  if (!response.ok) {
    console.error("[GLOBAL_STOCK] harga modal update failed", data);
    throw new Error(data.error || "Gagal memperbarui harga modal");
  }

  console.log("[GLOBAL_STOCK] harga modal update succeeded", data);
  await ensureWarehouseSKUsLoaded(true);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("stock-updated"));
  }
  return getWarehouseRows();
}

export async function syncWarehouseStockMovement(params: {
  warehouseId: string;
  variantId: string;
  qty: number;
  type: StockMovement["type"];
  timestamp?: string;
}): Promise<WarehouseSKU[]> {
  const row = getGlobalWarehouseRowByVariantId(params.variantId, params.warehouseId) ??
    getWarehouseRows().find((item) => item.variantId === params.variantId) ??
    null;

  if (!row) {
    throw new Error("SKU gudang tidak ditemukan untuk pergerakan stock");
  }

  const currentStock = Math.max(0, row.totalStock - row.reservedStock);
  const nextStock = params.type === "out"
    ? currentStock - params.qty
    : params.type === "transfer"
      ? currentStock
      : currentStock + params.qty;

  if (nextStock < 0) {
    throw new Error("Stock tidak boleh negatif");
  }

  return updateGlobalWarehouseStock({
    skuGudang: row.skuCode,
    newStock: nextStock,
    userId: getAuthUserId() ?? 0,
    timestamp: params.timestamp ?? new Date().toISOString(),
    warehouseId: row.warehouseId,
  });
}