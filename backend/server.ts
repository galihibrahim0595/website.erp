import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

type Role = "Owner" | "Admin" | "Packing" | "Viewer";

interface AuthUserPayload {
  id: number;
  username: string;
  email: string;
  role: Role;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUserPayload;
    }
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;
const JWT_SECRET = process.env.JWT_SECRET || "novaoms-secret";
const JWT_EXPIRES_IN = "1h";

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

const dbPath = path.join(__dirname, "data", "auth.db");
const db = new Database(dbPath);

type ProductPayload = {
  name: string;
  category: string;
  sku: string;
  description: string;
  variations: Array<{ name: string; options: string[] }>;
  price: number;
  promoPrice?: number;
  stock: number;
  wholesale?: string;
  weight: number;
  size: { width: number; height: number; length: number };
  condition: string;
  preorder: boolean;
  store?: string;
  images?: string[];
  video?: string | null;
  combinations?: Array<{ label: string; values: string[] }>;
};

function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'Owner',
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      store TEXT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      sku TEXT NOT NULL UNIQUE,
      description TEXT,
      variations TEXT NOT NULL,
      combinations TEXT,
      price REAL NOT NULL,
      promo_price REAL,
      stock INTEGER NOT NULL,
      wholesale TEXT,
      weight REAL,
      package_width REAL,
      package_height REAL,
      package_length REAL,
      condition TEXT,
      preorder INTEGER NOT NULL DEFAULT 0,
      images TEXT,
      video TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS sku_mappings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      marketplace_variant_id TEXT NOT NULL,
      marketplace TEXT NOT NULL,
      marketplace_sku TEXT NOT NULL,
      warehouse_sku TEXT NOT NULL,
      product_id TEXT,
      product_name TEXT,
      color TEXT,
      size TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(marketplace_variant_id, warehouse_sku)
    );

    CREATE TABLE IF NOT EXISTS warehouse_skus (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      warehouse_id TEXT NOT NULL,
      sku_code TEXT NOT NULL,
      product_name TEXT NOT NULL,
      color TEXT,
      size TEXT,
      cost_price REAL NOT NULL,
      selling_price REAL NOT NULL,
      total_stock INTEGER NOT NULL DEFAULT 0,
      reserved_stock INTEGER NOT NULL DEFAULT 0,
      weight_gram REAL,
      dimension_length REAL,
      dimension_width REAL,
      dimension_height REAL,
      barcode TEXT,
      variant_id TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(warehouse_id, sku_code)
    );
  `);

  const existing = db.prepare("SELECT COUNT(*) AS count FROM users").get();
  if (existing.count === 0) {
    const hashed = bcrypt.hashSync("123Galiih_", 10);
    db.prepare(
      "INSERT INTO users (username, email, password, role, enabled) VALUES (?, ?, ?, ?, ?)",
    ).run("maqillibanashauqi", "maqillibanashauqi@novaoms.com", hashed, "Owner", 1);
  }
}

initDatabase();

function createToken(user: { id: number; username: string; email: string; role: Role }) {
  return jwt.sign(
    { sub: user.id, username: user.username, email: user.email, role: user.role },
    JWT_SECRET,
    {
      expiresIn: JWT_EXPIRES_IN,
    },
  );
}

function authenticateToken(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers["authorization"];
  const token = typeof authHeader === "string" && authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  if (!token) {
    return res.status(401).json({ error: "Token missing" });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as {
      sub: number;
      username: string;
      email: string;
      role: Role;
    };
    req.user = {
      id: payload.sub,
      username: payload.username,
      email: payload.email,
      role: payload.role,
    };
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

function requireOwner(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (req.user?.role !== "Owner") {
    return res.status(403).json({ error: "Akses ditolak" });
  }
  next();
}

function validateRole(value: unknown): value is Role {
  return value === "Owner" || value === "Admin" || value === "Packing" || value === "Viewer";
}

app.post("/api/login", (req, res) => {
  const { username, password } = req.body;

  if (typeof username !== "string" || typeof password !== "string") {
    return res.status(400).json({ error: "Username and password are required" });
  }

  const user = db
    .prepare("SELECT id, username, email, password, role, enabled FROM users WHERE username = ?")
    .get(username);

  if (!user || !user.enabled) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const valid = bcrypt.compareSync(password, user.password);
  if (!valid) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = createToken(user);
  res.json({
    user: { id: user.id, username: user.username, email: user.email, role: user.role },
    token,
  });
});

app.post("/api/logout", (req, res) => {
  res.json({ success: true });
});

app.get("/api/users", authenticateToken, requireOwner, (req, res) => {
  const users = db
    .prepare("SELECT id, username, email, role, enabled, created_at FROM users ORDER BY created_at DESC")
    .all();
  res.json({ users });
});

app.post("/api/users", authenticateToken, requireOwner, (req, res) => {
  const { username, email, password, role, enabled } = req.body;

  if (
    typeof username !== "string" ||
    typeof email !== "string" ||
    typeof password !== "string" ||
    !validateRole(role) ||
    typeof enabled !== "boolean"
  ) {
    return res.status(400).json({ error: "Invalid user data" });
  }

  const existingUser = db
    .prepare("SELECT id FROM users WHERE username = ? OR email = ?")
    .get(username, email);
  if (existingUser) {
    return res.status(409).json({ error: "Username atau email sudah digunakan" });
  }

  const hashed = bcrypt.hashSync(password, 10);
  const result = db
    .prepare(
      "INSERT INTO users (username, email, password, role, enabled) VALUES (?, ?, ?, ?, ?)",
    )
    .run(username, email, hashed, role, enabled ? 1 : 0);

  const user = db
    .prepare("SELECT id, username, email, role, enabled, created_at FROM users WHERE id = ?")
    .get(result.lastInsertRowid);

  res.status(201).json({ user });
});

app.put("/api/users/:id", authenticateToken, requireOwner, (req, res) => {
  const id = Number(req.params.id);
  const { username, email, password, role, enabled } = req.body;

  if (Number.isNaN(id) || typeof username !== "string" || typeof email !== "string" || !validateRole(role) || typeof enabled !== "boolean") {
    return res.status(400).json({ error: "Invalid user data" });
  }

  const user = db.prepare("SELECT id FROM users WHERE id = ?").get(id);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  const conflict = db
    .prepare("SELECT id FROM users WHERE (username = ? OR email = ?) AND id != ?")
    .get(username, email, id);
  if (conflict) {
    return res.status(409).json({ error: "Username atau email sudah digunakan" });
  }

  if (typeof password === "string" && password.length > 0) {
    const hashed = bcrypt.hashSync(password, 10);
    db.prepare(
      "UPDATE users SET username = ?, email = ?, password = ?, role = ?, enabled = ? WHERE id = ?",
    ).run(username, email, hashed, role, enabled ? 1 : 0, id);
  } else {
    db.prepare("UPDATE users SET username = ?, email = ?, role = ?, enabled = ? WHERE id = ?").run(
      username,
      email,
      role,
      enabled ? 1 : 0,
      id,
    );
  }

  const updated = db
    .prepare("SELECT id, username, email, role, enabled, created_at FROM users WHERE id = ?")
    .get(id);
  res.json({ user: updated });
});

app.delete("/api/users/:id", authenticateToken, requireOwner, (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: "Invalid user id" });
  }

  if (id === req.user?.id) {
    return res.status(400).json({ error: "Tidak bisa menghapus akun sendiri" });
  }

  const result = db.prepare("DELETE FROM users WHERE id = ?").run(id);
  if (result.changes === 0) {
    return res.status(404).json({ error: "User not found" });
  }

  res.json({ success: true });
});

function isValidVariation(value: unknown): value is { name: string; options: string[] } {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as any).name === "string" &&
    Array.isArray((value as any).options) &&
    (value as any).options.every((item: unknown) => typeof item === "string")
  );
}

app.post("/api/products", authenticateToken, (req, res) => {
  const payload = req.body as ProductPayload;

  if (
    typeof payload.name !== "string" ||
    typeof payload.category !== "string" ||
    typeof payload.sku !== "string" ||
    typeof payload.description !== "string" ||
    !Array.isArray(payload.variations) ||
    payload.variations.length === 0 ||
    payload.variations.some((variation) => !isValidVariation(variation)) ||
    typeof payload.price !== "number" ||
    Number.isNaN(payload.price) ||
    typeof payload.stock !== "number" ||
    Number.isNaN(payload.stock) ||
    typeof payload.weight !== "number" ||
    Number.isNaN(payload.weight) ||
    typeof payload.size !== "object" ||
    payload.size === null ||
    typeof payload.size.width !== "number" ||
    typeof payload.size.height !== "number" ||
    typeof payload.size.length !== "number" ||
    typeof payload.condition !== "string" ||
    typeof payload.preorder !== "boolean"
  ) {
    return res.status(400).json({ error: "Invalid product data" });
  }

  try {
    const result = db.prepare(
      `INSERT INTO products (
        store,
        name,
        category,
        sku,
        description,
        variations,
        combinations,
        price,
        promo_price,
        stock,
        wholesale,
        weight,
        package_width,
        package_height,
        package_length,
        condition,
        preorder,
        images,
        video
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      payload.store ?? null,
      payload.name,
      payload.category,
      payload.sku,
      payload.description,
      JSON.stringify(payload.variations),
      payload.combinations ? JSON.stringify(payload.combinations) : null,
      payload.price,
      typeof payload.promoPrice === "number" ? payload.promoPrice : null,
      payload.stock,
      payload.wholesale ?? null,
      payload.weight,
      payload.size.width,
      payload.size.height,
      payload.size.length,
      payload.condition,
      payload.preorder ? 1 : 0,
      payload.images ? JSON.stringify(payload.images) : null,
      payload.video ?? null,
    );

    const product = db
      .prepare("SELECT * FROM products WHERE id = ?")
      .get(result.lastInsertRowid);

    res.status(201).json({ product });
  } catch (error) {
    console.error(error);
    if ((error as any)?.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res.status(409).json({ error: "SKU sudah digunakan" });
    }
    res.status(500).json({ error: "Gagal menyimpan produk" });
  }
});

app.get("/api/me", authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

// ============ SKU Mappings Endpoints ============

app.get("/api/sku-mappings", authenticateToken, (req, res) => {
  try {
    const mappings = db.prepare("SELECT * FROM sku_mappings ORDER BY created_at DESC").all();
    res.json({ mappings });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Gagal mengambil data mapping" });
  }
});

app.get("/api/sku-mappings/variant/:variantId", authenticateToken, (req, res) => {
  const { variantId } = req.params;
  if (typeof variantId !== "string") {
    return res.status(400).json({ error: "Invalid variant ID" });
  }

  try {
    const mappings = db
      .prepare("SELECT * FROM sku_mappings WHERE marketplace_variant_id = ?")
      .all(variantId);
    res.json({ mappings, count: mappings.length });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Gagal mengambil data mapping" });
  }
});

app.post("/api/sku-mappings", authenticateToken, (req, res) => {
  const {
    marketplace_variant_id,
    marketplace,
    marketplace_sku,
    warehouse_sku,
    product_id,
    product_name,
    color,
    size,
  } = req.body;

  // Validasi input
  if (
    typeof marketplace_variant_id !== "string" ||
    typeof marketplace !== "string" ||
    typeof marketplace_sku !== "string" ||
    typeof warehouse_sku !== "string"
  ) {
    return res.status(400).json({ error: "Invalid mapping data" });
  }

  try {
    // Hapus mapping lama untuk variant ini jika ada
    db.prepare("DELETE FROM sku_mappings WHERE marketplace_variant_id = ?").run(
      marketplace_variant_id,
    );

    const result = db
      .prepare(
        `INSERT INTO sku_mappings (
          marketplace_variant_id,
          marketplace,
          marketplace_sku,
          warehouse_sku,
          product_id,
          product_name,
          color,
          size
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        marketplace_variant_id,
        marketplace,
        marketplace_sku,
        warehouse_sku,
        product_id ?? null,
        product_name ?? null,
        color ?? null,
        size ?? null,
      );

    const mapping = db
      .prepare("SELECT * FROM sku_mappings WHERE id = ?")
      .get(result.lastInsertRowid);

    res.status(201).json({ mapping });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Gagal menyimpan mapping" });
  }
});

app.put("/api/sku-mappings/:id", authenticateToken, (req, res) => {
  const id = Number(req.params.id);
  const { warehouse_sku } = req.body;

  if (Number.isNaN(id) || typeof warehouse_sku !== "string") {
    return res.status(400).json({ error: "Invalid data" });
  }

  try {
    const result = db
      .prepare("UPDATE sku_mappings SET warehouse_sku = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
      .run(warehouse_sku, id);

    if (result.changes === 0) {
      return res.status(404).json({ error: "Mapping not found" });
    }

    const mapping = db.prepare("SELECT * FROM sku_mappings WHERE id = ?").get(id);
    res.json({ mapping });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Gagal memperbarui mapping" });
  }
});

app.delete("/api/sku-mappings/:id", authenticateToken, (req, res) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) {
    return res.status(400).json({ error: "Invalid mapping ID" });
  }

  try {
    const result = db.prepare("DELETE FROM sku_mappings WHERE id = ?").run(id);
    if (result.changes === 0) {
      return res.status(404).json({ error: "Mapping not found" });
    }
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Gagal menghapus mapping" });
  }
});

// ==================== Warehouse SKU Master Data Endpoints ====================

app.get("/api/warehouse-skus", authenticateToken, (req, res) => {
  try {
    const warehouseId = req.query.warehouseId as string | undefined;
    
    let query = "SELECT * FROM warehouse_skus";
    const params: any[] = [];
    
    if (warehouseId) {
      query += " WHERE warehouse_id = ?";
      params.push(warehouseId);
    }
    
    const rows = db.prepare(query).all(...params);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Gagal mengambil warehouse SKU" });
  }
});

app.get("/api/warehouse-skus/:id", authenticateToken, (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "Invalid warehouse SKU ID" });
    }
    
    const row = db.prepare("SELECT * FROM warehouse_skus WHERE id = ?").get(id);
    if (!row) {
      return res.status(404).json({ error: "Warehouse SKU not found" });
    }
    
    res.json({ success: true, data: row });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Gagal mengambil warehouse SKU" });
  }
});

app.get("/api/warehouse-skus/by-code/:code", authenticateToken, (req, res) => {
  try {
    const { code } = req.params;
    const warehouseId = req.query.warehouseId as string | undefined;
    
    let query = "SELECT * FROM warehouse_skus WHERE sku_code = ?";
    const params: any[] = [code];
    
    if (warehouseId) {
      query += " AND warehouse_id = ?";
      params.push(warehouseId);
    }
    
    const rows = db.prepare(query).all(...params);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Gagal mengambil warehouse SKU" });
  }
});

app.post("/api/warehouse-skus", authenticateToken, (req, res) => {
  try {
    const {
      warehouse_id,
      sku_code,
      product_name,
      color,
      size,
      cost_price,
      selling_price,
      total_stock,
      reserved_stock,
      weight_gram,
      dimension_length,
      dimension_width,
      dimension_height,
      barcode,
      variant_id,
    } = req.body;
    
    if (!warehouse_id || !sku_code || !product_name || cost_price === undefined || selling_price === undefined) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    
    const stmt = db.prepare(`
      INSERT INTO warehouse_skus (
        warehouse_id, sku_code, product_name, color, size,
        cost_price, selling_price, total_stock, reserved_stock,
        weight_gram, dimension_length, dimension_width, dimension_height,
        barcode, variant_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = stmt.run(
      warehouse_id,
      sku_code,
      product_name,
      color,
      size,
      cost_price,
      selling_price,
      total_stock ?? 0,
      reserved_stock ?? 0,
      weight_gram,
      dimension_length,
      dimension_width,
      dimension_height,
      barcode,
      variant_id
    );
    
    res.status(201).json({
      success: true,
      data: { id: result.lastInsertRowid, ...req.body },
    });
  } catch (error: any) {
    console.error(error);
    if (error.message?.includes("UNIQUE constraint failed")) {
      return res.status(409).json({ error: "Warehouse SKU sudah ada untuk SKU code ini" });
    }
    res.status(500).json({ error: "Gagal membuat warehouse SKU" });
  }
});

app.put("/api/warehouse-skus/:id", authenticateToken, (req, res) => {
  try {
    const id = req.params.id;  // ✅ FIXED: Accept string ID, not Number
    
    if (!id || typeof id !== "string") {
      return res.status(400).json({ error: "Invalid warehouse SKU ID" });
    }
    
    console.log(`[API] PUT /api/warehouse-skus/${id}`, req.body);  // ✅ DEBUGGING
    
    const {
      cost_price,
      selling_price,
      total_stock,
      reserved_stock,
      product_name,
      weight_gram,
      dimension_length,
      dimension_width,
      dimension_height,
      barcode,
    } = req.body;
    
    // Only allow updating certain fields
    const updates: string[] = [];
    const params: any[] = [];
    
    if (cost_price !== undefined) {
      updates.push("cost_price = ?");
      params.push(cost_price);
    }
    if (selling_price !== undefined) {
      updates.push("selling_price = ?");
      params.push(selling_price);
    }
    if (total_stock !== undefined) {
      updates.push("total_stock = ?");
      params.push(total_stock);
    }
    if (reserved_stock !== undefined) {
      updates.push("reserved_stock = ?");
      params.push(reserved_stock);
    }
    if (product_name !== undefined) {
      updates.push("product_name = ?");
      params.push(product_name);
    }
    if (weight_gram !== undefined) {
      updates.push("weight_gram = ?");
      params.push(weight_gram);
    }
    if (dimension_length !== undefined) {
      updates.push("dimension_length = ?");
      params.push(dimension_length);
    }
    if (dimension_width !== undefined) {
      updates.push("dimension_width = ?");
      params.push(dimension_width);
    }
    if (dimension_height !== undefined) {
      updates.push("dimension_height = ?");
      params.push(dimension_height);
    }
    if (barcode !== undefined) {
      updates.push("barcode = ?");
      params.push(barcode);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }
    
    updates.push("updated_at = CURRENT_TIMESTAMP");
    params.push(id);
    
    const query = `UPDATE warehouse_skus SET ${updates.join(", ")} WHERE id = ?`;
    console.log(`[API] Query: ${query}`, params);  // ✅ DEBUGGING
    
    const result = db.prepare(query).run(...params);
    
    console.log(`[API] Update result:`, result);  // ✅ DEBUGGING
    
    if (result.changes === 0) {
      return res.status(404).json({ error: "Warehouse SKU not found" });
    }
    
    console.log(`[API] ✓ Successfully updated warehouse SKU ${id}`);  // ✅ DEBUGGING
    res.json({ success: true, message: "Warehouse SKU updated", id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Gagal memperbarui warehouse SKU" });
  }
});

app.delete("/api/warehouse-skus/:id", authenticateToken, (req, res) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) {
      return res.status(400).json({ error: "Invalid warehouse SKU ID" });
    }
    
    const result = db.prepare("DELETE FROM warehouse_skus WHERE id = ?").run(id);
    if (result.changes === 0) {
      return res.status(404).json({ error: "Warehouse SKU not found" });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Gagal menghapus warehouse SKU" });
  }
});

app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.listen(PORT, () => {
  console.log(`Backend auth server running on http://localhost:${PORT}`);
});
