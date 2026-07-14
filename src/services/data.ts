// In-memory data store. Structured like a repository so it can be replaced
// with a real API/DB client without touching UI code.

import type {
  Product, ProductVariant, Warehouse, WarehouseStockRow,
  Order, Supplier, Customer, StockMovement,
} from "@/types";
import { initializeWarehouseMasterData } from "./warehouse-master";

// -------------------- Warehouses --------------------
// Single Warehouse System
export const warehouses: Warehouse[] = [
  { id: "wh-1", name: "Gudang Utama", location: "Jakarta" },
];

// -------------------- Suppliers --------------------
export const suppliers: Supplier[] = [
  { id: "sup-1", name: "PT Tekstil Nusantara", contact: "Budi", phone: "08123456789", address: "Bandung" },
  { id: "sup-2", name: "CV Sinar Fashion", contact: "Sari", phone: "08129998877", address: "Jakarta" },
  { id: "sup-3", name: "UD Kaos Prima", contact: "Andi", phone: "0813222111", address: "Solo" },
];

// -------------------- Product Catalogue --------------------
const colors = ["Hitam", "Putih", "Navy", "Abu", "Merah"];
const sizes = ["S", "M", "L", "XL", "XXL"];
const marketplaces = ["shopee", "tiktok", "tokopedia", "lazada"] as const;
const STORE_OPTIONS = ["Toko Utama", "Toko Jakarta", "Toko Surabaya"];
const categories = ["Fashion Pria", "Fashion Wanita", "Aksesoris", "Elektronik", "Rumah Tangga"];

function makeVariants(productId: string, base: string, price: number, mapped: boolean): ProductVariant[] {
  const out: ProductVariant[] = [];
  colors.slice(0, 3).forEach((c) => {
    sizes.slice(0, 4).forEach((s) => {
      const sku = `${base}-${c.slice(0,3).toUpperCase()}-${s}`;
      out.push({
        id: `${productId}-${c}-${s}`,
        productId,
        sku,
        warehouseSku: mapped ? sku : undefined,
        barcode: `899${Math.floor(Math.random() * 1e10)}`,
        color: c,
        size: s,
        price: price + (s === "XL" ? 5000 : s === "XXL" ? 10000 : 0),
        mappingStatus: mapped ? "mapped" : "unmapped",
      });
    });
  });
  return out;
}

const productNames = [
  "Kaos Oversize Basic", "Kemeja Flanel Premium", "Hoodie Fleece Unisex",
  "Celana Chino Slim Fit", "Jaket Bomber Pilot", "Polo Shirt Cotton Combed",
  "Sweater Rajut Winter", "Kaos Polos Combed 30s", "Kemeja Linen Kasual",
  "Celana Jogger Trainer", "Jaket Parka Waterproof", "Kaos Grafis Vintage",
];

export const products: Product[] = productNames.flatMap((name, i) => {
  return marketplaces.slice(0, 2 + (i % 3)).map((mp, j): Product => {
    const id = `prd-${i}-${mp}`;
    const base = name.split(" ").slice(0, 2).map(w => w.slice(0, 3).toUpperCase()).join("");
    const price = 79000 + i * 12000;
    const mapped = (i + j) % 3 !== 0;
    return {
      id,
      name,
      photo: `https://picsum.photos/seed/${id}/120/120`,
      store: STORE_OPTIONS[i % STORE_OPTIONS.length] ?? "Toko Utama",
      description: `Deskripsi untuk ${name}`,
      category: categories[i % categories.length],
      brand: ["Nova", "UrbanCo", "Kaosmu", "StyleID"][i % 4],
      weightGram: 250 + i * 20,
      dimensions: { l: 30, w: 25, h: 3 },
      supplierId: suppliers[i % suppliers.length].id,
      masterSku: `${base}-${i}`,
      marketplace: mp,
      status: i % 7 === 0 ? "draft" : i % 5 === 0 ? "inactive" : "active",
      variants: makeVariants(id, base, price, mapped),
      updatedAt: new Date(Date.now() - i * 3_600_000 * 6).toISOString(),
    };
  });
});

// -------------------- Warehouse Stock --------------------
// Single source of truth for stock. Product page reads from here.
export const stock: WarehouseStockRow[] = [];
products.forEach((p) => {
  p.variants.forEach((v) => {
    warehouses.forEach((w, wi) => {
      const onHand = Math.floor(Math.random() * 80) + (wi === 0 ? 20 : 0);
      const reserved = Math.floor(Math.random() * 8);
      stock.push({
        warehouseId: w.id,
        variantId: v.id,
        onHand,
        reserved,
        available: onHand - reserved,
      });
    });
  });
});

export function getVariantStock(variantId: string): number {
  return stock
    .filter((s) => s.variantId === variantId)
    .reduce((sum, s) => sum + s.available, 0);
}

export function getProductStock(productId: string): number {
  const p = products.find((x) => x.id === productId);
  if (!p) return 0;
  return p.variants.reduce((sum, v) => sum + getVariantStock(v.id), 0);
}

export function getProductPrice(productId: string): { min: number; max: number } {
  const p = products.find((x) => x.id === productId);
  if (!p || p.variants.length === 0) return { min: 0, max: 0 };
  const prices = p.variants.map((v) => v.price);
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

export function getProductMappingStatus(p: Product): "mapped" | "unmapped" | "partial" {
  const total = p.variants.length;
  const mapped = p.variants.filter((v) => v.mappingStatus === "mapped").length;
  if (mapped === 0) return "unmapped";
  if (mapped === total) return "mapped";
  return "partial";
}

export function getProductById(id: string): Product | undefined {
  return products.find((product) => product.id === id);
}

export function createProduct(product: Product): Product {
  products.push(product);
  return product;
}

export function updateProduct(product: Product): Product | undefined {
  const index = products.findIndex((item) => item.id === product.id);
  if (index === -1) return undefined;
  products[index] = product;
  return product;
}

export function deleteProduct(productId: string): boolean {
  const index = products.findIndex((item) => item.id === productId);
  if (index === -1) return false;
  products.splice(index, 1);
  return true;
}

export function setProductStatus(productId: string, status: ProductStatus): Product | undefined {
  const product = getProductById(productId);
  if (!product) return undefined;
  product.status = status;
  return product;
}

export function getWarehouseVariantStock(warehouseId: string, variantId: string): number {
  const row = stock.find((item) => item.warehouseId === warehouseId && item.variantId === variantId);
  return row ? row.available : 0;
}

export function updateWarehouseStock(warehouseId: string, variantId: string, qty: number, type: StockMovement["type"]): boolean {
  const row = stock.find((item) => item.warehouseId === warehouseId && item.variantId === variantId);

  if (type === "in") {
    if (row) {
      row.onHand += qty;
      row.available = Math.max(0, row.onHand - row.reserved);
      return true;
    }

    stock.push({ warehouseId, variantId, onHand: qty, reserved: 0, available: qty });
    return true;
  }

  if (type === "out") {
    if (!row || row.available < qty) {
      return false;
    }
    row.onHand = Math.max(0, row.onHand - qty);
    row.available = Math.max(0, row.onHand - row.reserved);
    return true;
  }

  return true;
}

export function createStockMovement(movement: Omit<StockMovement, "id" | "createdAt">): StockMovement | undefined {
  if (!updateWarehouseStock(movement.warehouseId, movement.variantId, movement.qty, movement.type)) {
    return undefined;
  }

  const nextMovement: StockMovement = {
    ...movement,
    id: `mv-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    reference: movement.reference ?? `REF-${100000 + stockMovements.length + 1}`,
  };

  stockMovements.unshift(nextMovement);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("stock-updated"));
  }

  return nextMovement;
}

// -------------------- Orders --------------------
const buyerNames = ["Ahmad Fauzi", "Siti Rahayu", "Budi Santoso", "Dewi Lestari", "Rizky Pratama", "Nur Aisyah", "Andi Wibowo", "Sri Wahyuni"];
const statuses: Order["status"][] = ["waiting_payment", "ready_to_process", "picking", "packing", "waiting_pickup", "completed", "returned"];
const orderMarketplaces: Order["marketplace"][] = ["shopee", "tiktok", "tokopedia", "lazada", "website", "whatsapp", "offline"];
const couriers: Order["courier"][] = ["jnt", "jne", "sicepat", "anteraja", "ninja", "spx", "pos", "idexpress"];
const paymentStatuses: Order["paymentStatus"][] = ["paid", "paid", "paid", "unpaid", "cod", "refund"];
const admins = ["Rina", "Dimas", "Yulia", "Fajar", "Nadia"];

// Deterministic ordinal reference to avoid SSR hydration mismatches.
const ORDER_EPOCH = new Date("2026-07-09T09:00:00+07:00").getTime();

export const orders: Order[] = Array.from({ length: 120 }, (_, i): Order => {
  const p = products[i % products.length];
  const v = p.variants[i % p.variants.length];
  const qty = 1 + (i % 3);
  const mp = orderMarketplaces[i % orderMarketplaces.length];
  const status = statuses[i % statuses.length];
  const courier = couriers[i % couriers.length];
  const paymentStatus: Order["paymentStatus"] =
    status === "waiting_payment" ? "unpaid"
    : status === "returned" ? "refund"
    : paymentStatuses[i % paymentStatuses.length];
  const hasAwb = ["packing","waiting_pickup","completed"].includes(status) || i % 4 === 0;
  return {
    id: `ord-${i}`,
    code: `INV-${String(100000 + i)}`,
    marketplace: mp,
    buyerName: buyerNames[i % buyerNames.length],
    status,
    items: [{
      variantId: v.id,
      productName: p.name,
      variantLabel: `${v.color} ${v.size}`,
      sku: v.sku,
      qty,
      price: v.price,
    }],
    total: v.price * qty,
    createdAt: new Date(ORDER_EPOCH - i * 3_600_000 * 3).toISOString(),
    awb: hasAwb ? `${courier.toUpperCase()}${1000000 + i}` : undefined,
    courier,
    paymentStatus,
    warehouseId: warehouses[i % warehouses.length].id,
    adminName: admins[i % admins.length],
  };
});

export function getOrders(): Order[] {
  return orders.map((order) => ({
    ...order,
    items: order.items.map((item) => ({ ...item })),
  }));
}

export function updateOrderStatus(id: string, status: Order["status"]): Order | undefined {
  const order = orders.find((o) => o.id === id);
  if (!order) return undefined;
  order.status = status;
  return order;
}

export function updateOrdersStatus(updates: { id: string; status: Order["status"] }[]): Order[] {
  updates.forEach(({ id, status }) => {
    const order = orders.find((o) => o.id === id);
    if (order) {
      order.status = status;
    }
  });
  return orders;
}

// -------------------- Customers --------------------
export const customers: Customer[] = buyerNames.map((n, i) => ({
  id: `cus-${i}`,
  name: n,
  phone: `0812${String(10000000 + i * 12345).slice(0, 8)}`,
  totalOrders: 3 + i * 2,
  totalSpent: 250_000 + i * 175_000,
}));

// -------------------- Stock movements --------------------
export const stockMovements: StockMovement[] = Array.from({ length: 30 }, (_, i): StockMovement => {
  const v = products[i % products.length].variants[0];
  const types: StockMovement["type"][] = ["in", "out", "adjustment", "transfer"];
  return {
    id: `mv-${i}`,
    type: types[i % 4],
    variantId: v.id,
    warehouseId: warehouses[i % warehouses.length].id,
    qty: 5 + (i % 20),
    note: ["Pembelian dari supplier", "Penjualan online", "Koreksi opname", "Transfer antar gudang"][i % 4],
    createdAt: new Date(Date.now() - i * 3_600_000 * 5).toISOString(),
    reference: `REF-${1000 + i}`,
  };
});

// -------------------- Initialize Warehouse Master Data ====================
// This runs once on app startup to populate the master data
initializeWarehouseMasterData();
