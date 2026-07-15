import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, "database.db");
const db = new Database(dbPath);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS warehouse_stock (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sku_gudang TEXT NOT NULL UNIQUE,
    nama_sku TEXT NOT NULL,
    variasi TEXT,
    harga_modal REAL NOT NULL DEFAULT 0,
    harga_jual REAL NOT NULL DEFAULT 0,
    total_stock INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

export type WarehouseStockInput = {
  sku_gudang: string;
  nama_sku: string;
  variasi?: string;
  harga_modal: number;
  harga_jual: number;
  total_stock: number;
};

function getBySkuStmt() {
  return db.prepare("SELECT * FROM warehouse_stock WHERE sku_gudang = ?");
}

function normalizeNonNegativeNumber(value: unknown): number {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) {
    throw new Error("Nilai harus berupa angka dan tidak boleh negatif");
  }
  return num;
}

export function updateHargaModal(sku_gudang: string, harga_baru: number) {
  const stmt = db.prepare(
    `UPDATE warehouse_stock
     SET harga_modal = ?, updated_at = CURRENT_TIMESTAMP
     WHERE sku_gudang = ?`,
  );

  const normalizedPrice = normalizeNonNegativeNumber(harga_baru);
  const result = stmt.run(normalizedPrice, sku_gudang);
  if (result.changes === 0) {
    return null;
  }

  return getStock(sku_gudang);
}

export function updateStock(sku_gudang: string, stock_baru: number) {
  const stmt = db.prepare(
    `UPDATE warehouse_stock
     SET total_stock = ?, updated_at = CURRENT_TIMESTAMP
     WHERE sku_gudang = ?`,
  );

  const normalizedStock = normalizeNonNegativeNumber(stock_baru);
  const result = stmt.run(normalizedStock, sku_gudang);
  if (result.changes === 0) {
    return null;
  }

  return getStock(sku_gudang);
}

export function getStock(sku_gudang: string) {
  return getBySkuStmt().get(sku_gudang) ?? null;
}

export function getAllStock() {
  return db.prepare("SELECT * FROM warehouse_stock ORDER BY updated_at DESC, id DESC").all();
}

export function insertSKU(data: WarehouseStockInput) {
  const sku_gudang = String(data.sku_gudang || "").trim();
  const nama_sku = String(data.nama_sku || "").trim();
  const variasi = data.variasi ? String(data.variasi).trim() : "";

  if (!sku_gudang || !nama_sku) {
    throw new Error("sku_gudang dan nama_sku wajib diisi");
  }

  const harga_modal = normalizeNonNegativeNumber(data.harga_modal);
  const harga_jual = normalizeNonNegativeNumber(data.harga_jual);
  const total_stock = Math.floor(normalizeNonNegativeNumber(data.total_stock));

  const stmt = db.prepare(
    `INSERT INTO warehouse_stock (
      sku_gudang,
      nama_sku,
      variasi,
      harga_modal,
      harga_jual,
      total_stock
    ) VALUES (?, ?, ?, ?, ?, ?)`,
  );

  stmt.run(sku_gudang, nama_sku, variasi, harga_modal, harga_jual, total_stock);
  return getStock(sku_gudang);
}
