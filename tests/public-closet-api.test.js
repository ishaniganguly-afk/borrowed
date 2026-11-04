import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import pg from "pg";

test("public links expose only the owner's lendable items and public fields", {
  skip: !process.env.TEST_BASE_URL,
}, async () => {
  const base = process.env.TEST_BASE_URL;
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const emails = [0, 1].map((i) => `sharing-${randomUUID()}-${i}@example.invalid`);
  const cookies = [];
  async function call(path, method = "GET", cookie, body) {
    const response = await fetch(base + path, {
      method, headers: { ...(cookie ? { cookie } : {}), ...(body ? { "Content-Type": "application/json" } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return { status: response.status, data: await response.json(), cookie: response.headers.get("set-cookie")?.split(";")[0],
      cache: response.headers.get("cache-control") };
  }
  try {
    assert.equal((await call("/api/share-link", "POST")).status, 401);
    for (const source of ["/src/App.jsx", "/src/Closet.jsx", "/src/ShareCloset.jsx", "/src/PublicCloset.jsx"]) {
      assert.equal((await fetch(base + source)).status, 200);
    }
    for (const email of emails) {
      const signup = await call("/api/auth/signup", "POST", undefined, { email, password: "Sharing-test-2026!" });
      assert.equal(signup.status, 201);
      cookies.push(signup.cookie);
    }
    const [a, b] = cookies;
    assert.equal((await pool.query("SELECT share_slug FROM users WHERE email = $1", [emails[0]])).rows[0].share_slug, null);
    const [first, concurrent] = await Promise.all([call("/api/share-link", "POST", a), call("/api/share-link", "POST", a)]);
    assert.equal(first.status, 200);
    assert.equal(first.data.path, concurrent.data.path);
    assert.equal((await call("/api/share-link", "POST", a)).data.path, first.data.path);
    const other = await call("/api/share-link", "POST", b);
    assert.notEqual(other.data.path, first.data.path);
    const slug = first.data.path.split("/").pop();
    const publicPath = `/api/public/closets/${slug}`;
    assert.equal((await pool.query("SELECT share_slug FROM users WHERE email = $1", [emails[0]])).rows[0].share_slug, slug);
    assert.deepEqual((await call(publicPath)).data, { items: [] });
    const category = (await call("/api/categories", "GET", a)).data.categories[0];
    const lendable = { name: "Public dress", categoryId: category.id, brand: "Test brand", size: "M",
      color: "Blue", fitNotes: "Relaxed fit", price: 9876.54, availableToLend: true };
    const visible = await call("/api/items", "POST", a, lendable);
    assert.equal(visible.status, 201);
    assert.equal((await call("/api/items", "POST", a, { ...lendable, name: "SECRET PRIVATE ITEM", availableToLend: false })).status, 201);
    assert.equal((await call("/api/items", "POST", b, { ...lendable, name: "OTHER OWNER ITEM" })).status, 201);
    const expected = { items: [{ name: "Public dress", category: category.name, brand: "Test brand", size: "M",
      color: "Blue", fitNotes: "Relaxed fit" }] };
    const response = await call(publicPath); // Deliberately no login cookie.
    assert.equal(response.status, 200);
    assert.equal(response.cache, "no-store");
    assert.deepEqual(response.data, expected); // Strict allowlist: no price, email, or private IDs.
    assert.deepEqual((await call(publicPath, "GET", b)).data, expected);
    const raw = JSON.stringify(response.data);
    for (const secret of ["SECRET PRIVATE ITEM", "OTHER OWNER ITEM", "9876.54", ...emails]) assert.ok(!raw.includes(secret));
    assert.equal((await fetch(base + first.data.path)).status, 200);
    assert.equal((await call("/api/public/closets/unknown-" + randomUUID())).status, 404);
    assert.equal((await call(`/api/items/${visible.data.item.id}`, "PUT", a, { ...lendable, availableToLend: false })).status, 200);
    assert.deepEqual((await call(publicPath)).data, { items: [] }); // Revoked item disappears.
  } finally {
    for (const cookie of cookies) await call("/api/auth/logout", "POST", cookie).catch(() => {});
    try {
      await pool.query("DELETE FROM users WHERE email = ANY($1::text[])", [emails]);
    } finally {
      await pool.end();
    }
  }
});
