/**
 * Warehouse Master Data Service
 * Single source of truth for warehouse inventory, pricing, and product attributes
 */

import type { WarehouseSKU, WarehouseSKUStock } from "@/types/warehouse-master";
import { warehouses } from "./data";
import { products } from "./data";

// ==================== Warehouse Master SKUs ====================
// This is the MASTER DATA. Everything else reads from here.

export const warehouseSKUs: WarehouseSKU[] = [];

/**
 * Initialize warehouse master SKUs from products and warehouses
 * Run once to populate initial data
 */
export function initializeWarehouseMasterData() {
  if (warehouseSKUs.length > 0) return; // Already initialized

  let idCounter = 1;

  // Create a SKU in each warehouse for each product variant
  products.forEach((product) => {
    product.variants.forEach((variant) => {
      warehouses.forEach((warehouse) => {
        const wsku: WarehouseSKU = {
          id: `wsku-${idCounter}`,
          warehouseId: warehouse.id,
          skuCode: variant.sku,
          productName: product.name,
          color: variant.color,
          size: variant.size,
          costPrice: Math.floor(variant.price * 0.6), // 60% of selling price
          sellingPrice: variant.price,
          totalStock: Math.floor(Math.random() * 100) + 10,
          reservedStock: Math.floor(Math.random() * 10),
          weightGram: product.weightGram,
          dimensions: product.dimensions,
          barcode: variant.barcode,
          variantId: variant.id,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        warehouseSKUs.push(wsku);
        idCounter++;
      });
    });
  });

  console.log(`Initialized ${warehouseSKUs.length} warehouse SKUs`);
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
