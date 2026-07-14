/**
 * Warehouse Master Data Service
 * Single source of truth for warehouse inventory, pricing, and product attributes
 */

import type { WarehouseSKU, WarehouseSKUStock } from "@/types/warehouse-master";
import { getAuthHeaders } from "@/lib/auth";

// ==================== Warehouse Master SKUs ====================
// This is the MASTER DATA. Everything else reads from here.

export const warehouseSKUs: WarehouseSKU[] = [];

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

let loadingPromise: Promise<WarehouseSKU[]> | null = null;

function createDummyWarehouseSKUs(): WarehouseSKU[] {
  const now = new Date().toISOString();
  return [
    {
      id: "dummy-1",
      warehouseId: "wh-1",
      skuCode: "KA00VE-0-HIT-S",
      productName: "Kaos Oversize Premium",
      color: "Hitam",
      size: "S",
      costPrice: 45000,
      sellingPrice: 75000,
      totalStock: 120,
      reservedStock: 0,
      barcode: "899000000001",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "dummy-2",
      warehouseId: "wh-1",
      skuCode: "KA00VE-0-HIT-M",
      productName: "Kaos Oversize Premium",
      color: "Hitam",
      size: "M",
      costPrice: 45000,
      sellingPrice: 75000,
      totalStock: 85,
      reservedStock: 0,
      barcode: "899000000002",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "dummy-3",
      warehouseId: "wh-1",
      skuCode: "KA00VE-0-HIT-L",
      productName: "Kaos Oversize Premium",
      color: "Hitam",
      size: "L",
      costPrice: 45000,
      sellingPrice: 75000,
      totalStock: 15,
      reservedStock: 0,
      barcode: "899000000003",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "dummy-4",
      warehouseId: "wh-1",
      skuCode: "KA00VE-0-HIT-XL",
      productName: "Kaos Oversize Premium",
      color: "Hitam",
      size: "XL",
      costPrice: 45000,
      sellingPrice: 75000,
      totalStock: 3,
      reservedStock: 0,
      barcode: "899000000004",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "dummy-5",
      warehouseId: "wh-1",
      skuCode: "KA00VE-0-PUT-M",
      productName: "Kaos Oversize Premium",
      color: "Putih",
      size: "M",
      costPrice: 45000,
      sellingPrice: 75000,
      totalStock: 0,
      reservedStock: 0,
      barcode: "899000000005",
      createdAt: now,
      updatedAt: now,
    },
  ];
}

function applyWarehouseSkus(rows: WarehouseSKU[]) {
  warehouseSKUs.splice(0, warehouseSKUs.length, ...rows);
}

function mapBackendRowToWarehouseSKU(row: BackendWarehouseSkuRow): WarehouseSKU {
  return {
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
  };
}

async function seedDummyToDatabase() {
  const authHeaders = getAuthHeaders();
  if (!authHeaders.Authorization) {
    return;
  }

  const payloads = createDummyWarehouseSKUs().map((sku) => ({
    warehouse_id: sku.warehouseId,
    sku_code: sku.skuCode,
    product_name: sku.productName,
    color: sku.color,
    size: sku.size,
    cost_price: sku.costPrice,
    selling_price: sku.sellingPrice,
    total_stock: sku.totalStock,
    reserved_stock: sku.reservedStock,
    weight_gram: sku.weightGram,
    dimension_length: sku.dimensions?.length,
    dimension_width: sku.dimensions?.width,
    dimension_height: sku.dimensions?.height,
    barcode: sku.barcode,
    variant_id: sku.variantId,
  }));

  await Promise.all(
    payloads.map((payload) =>
      fetch("/api/warehouse-skus", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify(payload),
      })
    )
  );
}

/**
 * Synchronize in-memory warehouse master data from backend API.
 * Seeds dummy rows to DB only when backend table is empty.
 */
export async function ensureWarehouseSKUsLoaded(force = false): Promise<WarehouseSKU[]> {
  if (typeof window === "undefined") {
    return warehouseSKUs;
  }

  if (!force && warehouseSKUs.length > 0) {
    return warehouseSKUs;
  }

  if (loadingPromise) {
    return loadingPromise;
  }

  loadingPromise = (async () => {
    try {
      const authHeaders = getAuthHeaders();
      if (!authHeaders.Authorization) {
        if (warehouseSKUs.length === 0) {
          applyWarehouseSkus(createDummyWarehouseSKUs());
        }
        return warehouseSKUs;
      }

      const response = await fetch("/api/warehouse-skus", {
        headers: {
          ...authHeaders,
        },
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || "Gagal mengambil warehouse SKU");
      }

      let rows = (payload?.data ?? []) as BackendWarehouseSkuRow[];

      if (rows.length === 0) {
        await seedDummyToDatabase();

        const reloadResponse = await fetch("/api/warehouse-skus", {
          headers: {
            ...authHeaders,
          },
        });

        const reloadPayload = await reloadResponse.json();
        if (reloadResponse.ok) {
          rows = (reloadPayload?.data ?? []) as BackendWarehouseSkuRow[];
        }
      }

      if (rows.length === 0) {
        applyWarehouseSkus(createDummyWarehouseSKUs());
      } else {
        applyWarehouseSkus(rows.map(mapBackendRowToWarehouseSKU));
      }

      window.dispatchEvent(new Event("stock-updated"));
      return warehouseSKUs;
    } catch (error) {
      console.error("[warehouse-master] ensureWarehouseSKUsLoaded error:", error);
      if (warehouseSKUs.length === 0) {
        applyWarehouseSkus(createDummyWarehouseSKUs());
      }
      return warehouseSKUs;
    } finally {
      loadingPromise = null;
    }
  })();

  return loadingPromise;
}

/**
 * Initialize warehouse master SKUs from products and warehouses
 * Run once to populate initial data
 */
export function initializeWarehouseMasterData() {
  if (warehouseSKUs.length > 0) return; // Already initialized
  applyWarehouseSkus(createDummyWarehouseSKUs());
}

/**
 * Get warehouse SKU by ID
 */
export function getWarehouseSKU(id: string): WarehouseSKU | undefined {
  return warehouseSKUs.find((sku) => sku.id === id);
}

/**
 * Get warehouse SKU by skuCode and warehouseId
 */
export function getWarehouseSKUByCode(
  skuCode: string,
  warehouseId: string
): WarehouseSKU | undefined {
  return warehouseSKUs.find(
    (sku) => sku.skuCode === skuCode && sku.warehouseId === warehouseId
  );
}

/**
 * Get all warehouse SKUs for a warehouse
 */
export function getWarehouseSKUsByWarehouse(warehouseId: string): WarehouseSKU[] {
  return warehouseSKUs.filter((sku) => sku.warehouseId === warehouseId);
}

/**
 * Get warehouse SKU stock info (calculated available stock)
 */
export function getWarehouseSKUStock(id: string): WarehouseSKUStock | undefined {
  const sku = getWarehouseSKU(id);
  if (!sku) return undefined;
  return {
    id: sku.id,
    skuCode: sku.skuCode,
    totalStock: sku.totalStock,
    reservedStock: sku.reservedStock,
    availableStock: sku.totalStock - sku.reservedStock,
  };
}

/**
 * Get total available stock across all warehouses for a SKU code
 */
export function getTotalAvailableStock(skuCode: string): number {
  return warehouseSKUs
    .filter((sku) => sku.skuCode === skuCode)
    .reduce((sum, sku) => sum + (sku.totalStock - sku.reservedStock), 0);
}

/**
 * Reserve stock for an order
 * - Increases reservedStock
 * - Decreases availableStock
 * - Maintains totalStock
 */
export function reserveStock(
  warehouseSkuId: string,
  quantity: number
): { success: boolean; message: string } {
  const sku = getWarehouseSKU(warehouseSkuId);
  if (!sku) {
    return { success: false, message: "SKU Gudang tidak ditemukan" };
  }

  const availableStock = sku.totalStock - sku.reservedStock;
  if (availableStock < quantity) {
    return {
      success: false,
      message: `Stok tidak cukup. Available: ${availableStock}, Diminta: ${quantity}`,
    };
  }

  sku.reservedStock += quantity;
  sku.updatedAt = new Date().toISOString();
  return { success: true, message: "Stock reserved" };
}

/**
 * Release reserved stock (order cancelled)
 * - Decreases reservedStock
 * - Increases availableStock
 * - Maintains totalStock
 */
export function releaseStock(
  warehouseSkuId: string,
  quantity: number
): { success: boolean; message: string } {
  const sku = getWarehouseSKU(warehouseSkuId);
  if (!sku) {
    return { success: false, message: "SKU Gudang tidak ditemukan" };
  }

  if (sku.reservedStock < quantity) {
    return {
      success: false,
      message: `Reserved stock tidak cukup untuk dilepas. Current: ${sku.reservedStock}, Diminta: ${quantity}`,
    };
  }

  sku.reservedStock -= quantity;
  sku.updatedAt = new Date().toISOString();
  return { success: true, message: "Stock released" };
}

/**
 * Fulfill order (reduce total stock)
 * - Decreases totalStock
 * - Decreases reservedStock
 * - Maintains proportional availableStock reduction
 */
export function fulfillStock(
  warehouseSkuId: string,
  quantity: number
): { success: boolean; message: string } {
  const sku = getWarehouseSKU(warehouseSkuId);
  if (!sku) {
    return { success: false, message: "SKU Gudang tidak ditemukan" };
  }

  if (sku.reservedStock < quantity) {
    return {
      success: false,
      message: `Reserved stock tidak cukup. Current: ${sku.reservedStock}, Diminta: ${quantity}`,
    };
  }

  sku.totalStock -= quantity;
  sku.reservedStock -= quantity;
  sku.updatedAt = new Date().toISOString();
  return { success: true, message: "Stock fulfilled" };
}

/**
 * Adjust total stock (incoming stock, damage, etc)
 */
export function adjustStock(
  warehouseSkuId: string,
  quantity: number, // positive to add, negative to subtract
  reason?: string
): { success: boolean; message: string } {
  const sku = getWarehouseSKU(warehouseSkuId);
  if (!sku) {
    return { success: false, message: "SKU Gudang tidak ditemukan" };
  }

  sku.totalStock += quantity;
  // Don't change reserved stock, it's managed separately
  sku.updatedAt = new Date().toISOString();
  return { success: true, message: `Stock adjusted by ${quantity}. Reason: ${reason || "N/A"}` };
}

/**
 * Update warehouse SKU pricing and attributes
 */
export function updateWarehouseSKU(
  id: string,
  updates: Partial<WarehouseSKU>
): { success: boolean; message: string; sku?: WarehouseSKU } {
  const sku = getWarehouseSKU(id);
  if (!sku) {
    return { success: false, message: "SKU Gudang tidak ditemukan" };
  }

  // Only allow updating specific fields
  const allowedFields = [
    "costPrice",
    "sellingPrice",
    "productName",
    "barcode",
    "dimensions",
    "weightGram",
  ];

  allowedFields.forEach((field) => {
    if (field in updates) {
      (sku as any)[field] = (updates as any)[field];
    }
  });

  sku.updatedAt = new Date().toISOString();
  return { success: true, message: "SKU Gudang updated", sku };
}

/**
 * Search warehouse SKUs
 */
export function searchWarehouseSKUs(
  query: string,
  warehouseId?: string
): WarehouseSKU[] {
  const lowerQuery = query.toLowerCase();
  return warehouseSKUs.filter((sku) => {
    const matchQuery =
      sku.skuCode.toLowerCase().includes(lowerQuery) ||
      sku.productName.toLowerCase().includes(lowerQuery) ||
      sku.barcode?.toLowerCase().includes(lowerQuery);

    const matchWarehouse = !warehouseId || sku.warehouseId === warehouseId;
    return matchQuery && matchWarehouse;
  });
}
