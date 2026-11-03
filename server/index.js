import path from "node:path";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import express from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import bcrypt from "bcryptjs";
import pg from "pg";

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
