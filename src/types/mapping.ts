export interface SkuMapping {
  id: number;
  marketplace_variant_id: string;
  marketplace: string;
  marketplace_sku: string;
  warehouse_sku: string;
  product_id?: string;
  product_name?: string;
  color?: string;
  size?: string;
  created_at: string;
  updated_at: string;
}

export interface MarketplaceMapping {
  marketplace: string;
  count: number;
  mappings: SkuMapping[];
}

export interface WarehouseSkuMapping {
  warehouseSku: string;
  productName: string;
  productId: string;
  variantId: string;
  marketplacesSku?: string;
  photo?: string;
  hargaModal: number;
  hargaJual: number;
  totalStock: number;
  barcode?: string;
  marketplaceMappings: MarketplaceMapping[];
}

export type MappingStatus = "all" | "mapped" | "partial" | "unmapped";
export type FilterMarketplace = "all" | "shopee" | "tokopedia" | "tiktok" | "lazada";
