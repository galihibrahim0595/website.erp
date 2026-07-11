// Core ERP domain types. Structured to be swapped with real DB/API responses.

export type Marketplace =
  | "shopee" | "tiktok" | "tokopedia" | "lazada"
  | "website" | "whatsapp" | "offline" | "manual";

export type Courier =
  | "jnt" | "jne" | "sicepat" | "anteraja"
  | "ninja" | "spx" | "pos" | "idexpress";

export type PaymentStatus = "unpaid" | "paid" | "cod" | "refund";

export type ProductStatus = "active" | "inactive" | "draft";
export type MappingStatus = "mapped" | "unmapped" | "partial";

export interface WarehouseStockRow {
  warehouseId: string;
  variantId: string;
  onHand: number;
  reserved: number;
  available: number; // onHand - reserved
}

export interface ProductVariant {
  id: string;
  productId: string;
  sku: string;              // marketplace/variant sku
  warehouseSku?: string;    // mapped to gudang SKU
  barcode?: string;
  color?: string;
  size?: string;
  price: number;            // pulled from master
  photo?: string;
  mappingStatus: MappingStatus;
}

export interface Product {
  id: string;
  name: string;
  photo?: string;
  store?: string;
  video?: string;
  description?: string;
  category: string;
  brand?: string;
  weightGram?: number;
  dimensions?: { l: number; w: number; h: number };
  supplierId?: string;
  masterSku: string;         // SKU induk
  marketplace: Marketplace;
  status: ProductStatus;
  variants: ProductVariant[];
  updatedAt: string;
}

// Warehouse
export interface Warehouse {
  id: string;
  name: string;
  location: string;
}

export interface StockMovement {
  id: string;
  type: "in" | "out" | "adjustment" | "transfer";
  variantId: string;
  warehouseId: string;
  qty: number;
  note?: string;
  createdAt: string;
  reference?: string;
}

// Orders
export type OrderStatus =
  | "waiting_payment"
  | "ready_to_process"
  | "picking"
  | "packing"
  | "waiting_pickup"
  | "completed"
  | "returned";

export interface OrderItem {
  variantId: string;
  productName: string;
  variantLabel: string;
  sku: string;
  qty: number;
  price: number;
}

export interface Order {
  id: string;
  code: string;              // e.g. INV-000123
  marketplace: Marketplace;
  buyerName: string;
  status: OrderStatus;
  items: OrderItem[];
  total: number;
  createdAt: string;
  awb?: string;              // resi
  courier: Courier;
  paymentStatus: PaymentStatus;
  warehouseId: string;
  adminName: string;
}

// Master data
export interface Supplier {
  id: string;
  name: string;
  contact: string;
  phone: string;
  address: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  totalOrders: number;
  totalSpent: number;
}
