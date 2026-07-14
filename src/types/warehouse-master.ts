/**
 * Warehouse Master Data Types
 * Single Source of Truth for warehouse inventory and pricing
 */

export interface WarehouseSKU {
  id: string; // unique ID for this SKU in this warehouse (e.g., "wsku-1-KPS-HIT-M")
  warehouseId: string;
  skuCode: string; // SKU Gudang (e.g., "KPS-HIT-M")
  productName: string;
  color?: string;
  size?: string;
  
  // Pricing (Master data source)
  costPrice: number; // Harga Modal (IDR)
  sellingPrice: number; // Harga Jual (IDR)
  
  // Stock levels
  totalStock: number; // Total Stock
  reservedStock: number; // Reserved (from orders)
  // Available = totalStock - reservedStock (calculated)
  
  // Physical attributes
  weightGram?: number;
  dimensions?: {
    length: number; // cm
    width: number; // cm
    height: number; // cm
  };
  
  // Identifiers
  barcode?: string;
  variantId?: string; // reference to product variant (for cross-linking)
  
  // Metadata
  createdAt: string;
  updatedAt: string;
}

/**
 * Convenience type for stock info
 */
export interface WarehouseSKUStock {
  id: string;
  skuCode: string;
  totalStock: number;
  reservedStock: number;
  availableStock: number; // calculated: totalStock - reservedStock
}

/**
 * Stock transaction log
 */
export interface StockTransaction {
  id: string;
  warehouseSkuId: string;
  type: "in" | "out" | "reserve" | "release" | "adjustment";
  qty: number;
  fromStock?: number; // previous value
  toStock?: number; // new value
  reference?: string; // order ID, PO ID, etc
  notes?: string;
  createdAt: string;
  createdBy?: string;
}
