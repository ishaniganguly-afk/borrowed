import path from "node:path";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import express from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import bcrypt from "bcryptjs";
import pg from "pg";
import { validateItem } from "../shared/item-validation.js";

const { Pool } = pg;
const port = Number(process.env.PORT) || 5000;
const isProduction = process.env.NODE_ENV === "production";
const sessionSecret = process.env.SESSION_SECRET;
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set. Connect the app to Replit PostgreSQL.");
}
if (!sessionSecret) {
  throw new Error("SESSION_SECRET is not set. Add it in Replit Secrets to start the app.");
}

const pool = new Pool({ connectionString: databaseUrl });
const PgSessionStore = connectPgSimple(session);
const app = express();
const httpServer = createServer(app);
const currentDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDir, "..");

app.set("trust proxy", 1);
app.use(express.json({ limit: "16kb" }));
app.use(
  session({
    name: "borrowed.sid",
    store: new PgSessionStore({
      pool,
      tableName: "user_sessions",
      createTableIfMissing: false,
    }),
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: isProduction,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/",
    },
  }),
);

function safeUser(row) {
  return { email: row.email };
}

function regenerateSession(req) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((error) => (error ? reject(error) : resolve()));
  });
}

function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Please log in to continue." });
  }
  return next();
}

function parseItemId(rawId) {
  const id = Number(rawId);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function presentItem(row) {
  return {
    id: row.id,
    name: row.name,
    categoryId: row.category_id,
    category: row.category_name,
    brand: row.brand ?? "",
    size: row.size ?? "",
    color: row.color ?? "",
    price: row.price === null ? "" : Number(row.price),
    purchasedOn: row.purchased_on ? String(row.purchased_on).slice(0, 10) : "",
    fitNotes: row.fit_notes ?? "",
    availableToLend: row.available_to_lend,
    starred: row.starred === true,
    wearCount: row.wear_count,
    costPerWear: row.price != null && row.wear_count > 0 ? Number(row.price) / row.wear_count : null,
    createdAt: row.created_at ? String(row.created_at).slice(0, 10) : "",
  };
}

const itemSelect = `
  SELECT
    items.id,
    items.category_id,
    categories.name AS category_name,
    items.name,
    items.brand,
    items.size,
    items.color,
    items.price,
    TO_CHAR(items.purchased_on, 'YYYY-MM-DD') AS purchased_on,
    items.fit_notes,
    items.available_to_lend,
    stars.id IS NOT NULL AS starred,
    wear_stats.wear_count,
    TO_CHAR(items.created_at, 'YYYY-MM-DD') AS created_at
  FROM items
  JOIN categories ON categories.id = items.category_id
  LEFT JOIN stars ON stars.item_id = items.id AND stars.user_id = items.user_id
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::int AS wear_count FROM wears
    WHERE wears.item_id = items.id AND wears.user_id = items.user_id
  ) AS wear_stats ON TRUE
`;

function itemValues(body = {}) {
  return [
    typeof body.name === "string" ? body.name.trim() : "",
    body.categoryId === "" || body.categoryId == null ? null : Number(body.categoryId),
    typeof body.brand === "string" ? body.brand : null,
    typeof body.size === "string" ? body.size.trim() : null,
    typeof body.color === "string" ? body.color : null,
    body.price == null || String(body.price).trim() === "" ? null : body.price,
    body.purchasedOn === "" || body.purchasedOn == null ? null : body.purchasedOn,
    typeof body.fitNotes === "string" ? body.fitNotes : null,
    body.availableToLend === true,
  ];
}

function handleItemWriteError(error, res, next) {
  if (["22P02", "22007", "22008", "23502", "23503"].includes(error.code)) {
    return res.status(400).json({ error: "Unable to save item." });
  }
  return next(error);
}

async function itemValidationErrors(body) {
  const errors = validateItem(body);
  if (!errors.categoryId) {
    const category = await pool.query("SELECT id FROM categories WHERE id = $1", [Number(body.categoryId)]);
    if (category.rowCount === 0) errors.categoryId = "Please choose a category";
  }
  return errors;
}

function respondWithItemErrors(res, fieldErrors) {
  return res.status(400).json({
    error: "Please check the highlighted fields.",
    fieldErrors,
  });
}

app.get("/api/auth/me", async (req, res, next) => {
  if (!req.session.userId) return res.json({ user: null });
  try {
    const result = await pool.query(
      "SELECT email FROM users WHERE id = $1",
      [req.session.userId],
    );
    if (result.rowCount === 0) {
      return req.session.destroy(() => res.json({ user: null }));
    }
    return res.json({ user: safeUser(result.rows[0]) });
  } catch (error) {
    return next(error);
  }
});

app.post("/api/auth/signup", async (req, res, next) => {
  const email =
    typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";

  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "Enter a valid email address." });
  }
  if (password.length < 8 || Buffer.byteLength(password, "utf8") > 72) {
    return res.status(400).json({
      error: "Your password must be at least 8 characters and no more than 72 bytes.",
    });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email",
      [email, passwordHash],
    );
    await regenerateSession(req);
    req.session.userId = result.rows[0].id;
    return res.status(201).json({ user: safeUser(result.rows[0]) });
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({ error: "An account with this email already exists." });
    }
    return next(error);
  }
});

app.post("/api/auth/login", async (req, res, next) => {
  const email =
    typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const password = typeof req.body?.password === "string" ? req.body.password : "";

  if (!email || !password) {
    return res.status(400).json({ error: "Enter your email and password." });
  }

  try {
    const result = await pool.query(
      "SELECT id, email, password_hash FROM users WHERE email = $1",
      [email],
    );
    const account = result.rows[0];
    const passwordMatches =
      account && Buffer.byteLength(password, "utf8") <= 72
        ? await bcrypt.compare(password, account.password_hash)
        : false;
    if (!passwordMatches) {
      return res.status(401).json({ error: "Email or password is incorrect." });
    }

    await regenerateSession(req);
    req.session.userId = account.id;
    return res.json({ user: safeUser(account) });
  } catch (error) {
    return next(error);
  }
});

app.post("/api/auth/logout", (req, res) => {
  req.session.destroy((error) => {
    if (error) return res.status(500).json({ error: "Could not log out. Please try again." });
    res.clearCookie("borrowed.sid", {
      httpOnly: true,
      sameSite: "lax",
      secure: isProduction,
      path: "/",
    });
    return res.json({ ok: true });
  });
});

app.get("/api/categories", requireAuth, async (_req, res, next) => {
  try {
    const result = await pool.query(
      "SELECT id, name FROM categories ORDER BY id ASC",
    );
    return res.json({ categories: result.rows });
  } catch (error) {
    return next(error);
  }
});

app.get("/api/items", requireAuth, async (req, res, next) => {
  try {
    const result = await pool.query(
      `${itemSelect} WHERE items.user_id = $1
        AND ($2::boolean = FALSE OR stars.id IS NOT NULL)
        ORDER BY items.created_at DESC, items.id DESC`,
      [req.session.userId, req.query.starred === "true"],
    );
    return res.json({ items: result.rows.map(presentItem) });
  } catch (error) {
    return next(error);
  }
});

app.get("/api/items/:id", requireAuth, async (req, res, next) => {
  const id = parseItemId(req.params.id);
  if (!id) return res.status(404).json({ error: "Item not found." });

  try {
    const result = await pool.query(
      `${itemSelect} WHERE items.id = $1 AND items.user_id = $2`,
      [id, req.session.userId],
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Item not found." });
    }
    return res.json({ item: presentItem(result.rows[0]) });
  } catch (error) {
    return next(error);
  }
});

app.get("/api/items/:id/wears", requireAuth, async (req, res, next) => {
  const id = parseItemId(req.params.id);
  if (!id) return res.status(404).json({ error: "Item not found." });
  try {
    const owner = await pool.query("SELECT id FROM items WHERE id = $1 AND user_id = $2", [id, req.session.userId]);
    if (!owner.rowCount) return res.status(404).json({ error: "Item not found." });
    const result = await pool.query(
      `SELECT wears.id, TO_CHAR(wears.worn_on, 'YYYY-MM-DD') AS "wornOn", wears.occasion
       FROM wears JOIN items ON items.id = wears.item_id
       WHERE wears.item_id = $1 AND wears.user_id = $2 AND items.user_id = $2
       ORDER BY wears.worn_on DESC, wears.id DESC`,
      [id, req.session.userId],
    );
    return res.json({ wears: result.rows });
  } catch (error) {
    return next(error);
  }
});

app.post("/api/items/:id/wears", requireAuth, async (req, res, next) => {
  const id = parseItemId(req.params.id);
  if (!id) return res.status(404).json({ error: "Item not found." });
  try {
    const owner = await pool.query("SELECT id FROM items WHERE id = $1 AND user_id = $2", [id, req.session.userId]);
    if (!owner.rowCount) return res.status(404).json({ error: "Item not found." });
    const wornOn = typeof req.body?.wornOn === "string" ? req.body.wornOn : "";
    const occasion = typeof req.body?.occasion === "string" ? req.body.occasion.trim() : "";
    const date = new Date(`${wornOn}T00:00:00Z`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(wornOn) || wornOn.startsWith("0000") ||
        Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== wornOn) {
      return res.status(400).json({ error: "Please choose a valid wear date." });
    }
    if (!occasion) return res.status(400).json({ error: "Please add an event." });
    const result = await pool.query(
      `INSERT INTO wears (item_id, user_id, worn_on, occasion)
       SELECT id, $2, $3, $4 FROM items WHERE id = $1 AND user_id = $2
       RETURNING id, TO_CHAR(worn_on, 'YYYY-MM-DD') AS "wornOn", occasion`,
      [id, req.session.userId, wornOn, occasion],
    );
    if (!result.rowCount) return res.status(404).json({ error: "Item not found." });
    return res.status(201).json({ wear: result.rows[0] });
  } catch (error) {
    return next(error);
  }
});

app.delete("/api/items/:id/wears/:wearId", requireAuth, async (req, res, next) => {
  const id = parseItemId(req.params.id);
  const wearId = parseItemId(req.params.wearId);
  if (!id || !wearId) return res.status(404).json({ error: "Wear not found." });
  try {
    const result = await pool.query(
      `DELETE FROM wears USING items
       WHERE wears.id = $1 AND wears.item_id = $2 AND wears.user_id = $3
         AND items.id = wears.item_id AND items.user_id = $3
       RETURNING wears.id`,
      [wearId, id, req.session.userId],
    );
    if (!result.rowCount) return res.status(404).json({ error: "Wear not found." });
    return res.json({ ok: true });
  } catch (error) {
    return next(error);
  }
});

app.put("/api/items/:id/star", requireAuth, async (req, res, next) => {
  const id = parseItemId(req.params.id);
  if (!id) return res.status(404).json({ error: "Item not found." });
  try {
    const result = await pool.query(
      `WITH owned_item AS (
        SELECT id FROM items WHERE id = $1 AND user_id = $2
      ), added AS (
        INSERT INTO stars (user_id, item_id)
        SELECT $2, id FROM owned_item
        ON CONFLICT (user_id, item_id) DO NOTHING
        RETURNING id
      )
      SELECT id FROM owned_item`,
      [id, req.session.userId],
    );
    if (!result.rowCount) return res.status(404).json({ error: "Item not found." });
    return res.json({ starred: true });
  } catch (error) {
    return next(error);
  }
});

app.delete("/api/items/:id/star", requireAuth, async (req, res, next) => {
  const id = parseItemId(req.params.id);
  if (!id) return res.status(404).json({ error: "Item not found." });
  try {
    const result = await pool.query(
      `WITH owned_item AS (
        SELECT id FROM items WHERE id = $1 AND user_id = $2
      ), removed AS (
        DELETE FROM stars USING owned_item
        WHERE stars.item_id = owned_item.id AND stars.user_id = $2
        RETURNING stars.id
      )
      SELECT id FROM owned_item`,
      [id, req.session.userId],
    );
    if (!result.rowCount) return res.status(404).json({ error: "Item not found." });
    return res.json({ starred: false });
  } catch (error) {
    return next(error);
  }
});

app.post("/api/items", requireAuth, async (req, res, next) => {
  try {
    const fieldErrors = await itemValidationErrors(req.body);
    if (Object.keys(fieldErrors).length) return respondWithItemErrors(res, fieldErrors);
    const values = itemValues(req.body);
    const result = await pool.query(
      `INSERT INTO items (
        user_id, category_id, name, brand, size, color, price,
        purchased_on, fit_notes, available_to_lend
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id`,
      [
        req.session.userId,
        values[1],
        values[0],
        ...values.slice(2),
      ],
    );
    const item = await pool.query(
      `${itemSelect} WHERE items.id = $1 AND items.user_id = $2`,
      [result.rows[0].id, req.session.userId],
    );
    return res.status(201).json({ item: presentItem(item.rows[0]) });
  } catch (error) {
    return handleItemWriteError(error, res, next);
  }
});

app.put("/api/items/:id", requireAuth, async (req, res, next) => {
  const id = parseItemId(req.params.id);
  if (!id) return res.status(404).json({ error: "Item not found." });

  try {
    const ownedItem = await pool.query(
      "SELECT id FROM items WHERE id = $1 AND user_id = $2",
      [id, req.session.userId],
    );
    if (ownedItem.rowCount === 0) return res.status(404).json({ error: "Item not found." });
    const fieldErrors = await itemValidationErrors(req.body);
    if (Object.keys(fieldErrors).length) return respondWithItemErrors(res, fieldErrors);
    const values = itemValues(req.body);
    const result = await pool.query(
      `UPDATE items SET
        name = $3,
        category_id = $4,
        brand = $5,
        size = $6,
        color = $7,
        price = $8,
        purchased_on = $9,
        fit_notes = $10,
        available_to_lend = $11
      WHERE id = $1 AND user_id = $2
      RETURNING id`,
      [id, req.session.userId, values[0], ...values.slice(1)],
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Item not found." });
    }
    const item = await pool.query(
      `${itemSelect} WHERE items.id = $1 AND items.user_id = $2`,
      [id, req.session.userId],
    );
    return res.json({ item: presentItem(item.rows[0]) });
  } catch (error) {
    return handleItemWriteError(error, res, next);
  }
});

app.delete("/api/items/:id", requireAuth, async (req, res, next) => {
  const id = parseItemId(req.params.id);
  if (!id) return res.status(404).json({ error: "Item not found." });

  try {
    const result = await pool.query(
      "DELETE FROM items WHERE id = $1 AND user_id = $2 RETURNING id",
      [id, req.session.userId],
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Item not found." });
    }
    return res.json({ ok: true });
  } catch (error) {
    return next(error);
  }
});

if (isProduction) {
  const builtAssets = path.join(projectRoot, "dist");
  app.use(express.static(builtAssets));
  app.get("/{*splat}", (_req, res) => res.sendFile(path.join(builtAssets, "index.html")));
} else {
  const { createServer: createViteServer } = await import("vite");
  const vite = await createViteServer({
    configFile: path.join(projectRoot, "vite.config.js"),
    server: { middlewareMode: true, ws: { server: httpServer } },
    appType: "spa",
  });
  app.use(vite.middlewares);
}

app.use((error, _req, res, _next) => {
  console.error("Request failed:", error.message);
  if (res.headersSent) return;
  if (error.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Please send a valid request." });
  }
  return res.status(500).json({ error: "Something went wrong. Please try again." });
});

const server = httpServer.listen(port, "0.0.0.0", () => {
  console.log(`Borrowed is listening on port ${port}`);
});

async function shutdown() {
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
