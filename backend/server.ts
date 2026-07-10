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

app.get("/api/me", authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.listen(PORT, () => {
  console.log(`Backend auth server running on http://localhost:${PORT}`);
});
