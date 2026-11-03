import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import pg from "pg";

// Opt in against the development server:
// TEST_BASE_URL=http://127.0.0.1:5000 node --test tests/stars-api.test.js
test("stars persist, toggle, stay unique, and remain private to each owner", {
  skip: !process.env.TEST_BASE_URL,
}, async () => {
  const base = process.env.TEST_BASE_URL;
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const emails = [0, 1].map((index) => `stars-${randomUUID()}-${index}@example.invalid`);
  const cookies = [];

  async function request(path, method = "GET", cookie, body) {
    const response = await fetch(base + path, {
      method,
      headers: {
        ...(cookie ? { cookie } : {}),
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return {
      status: response.status,
      data: await response.json(),
      cookie: response.headers.get("set-cookie")?.split(";")[0],
    };
  }

  try {
    assert.equal((await request("/api/items?starred=true")).status, 401);
    assert.equal((await request("/api/items/1/star", "PUT")).status, 401);
    assert.equal((await request("/api/items/1/star", "DELETE")).status, 401);
    for (const email of emails) {
      const result = await request("/api/auth/signup", "POST", undefined, {
        email, password: "Stars-test-password-2026!",
      });
      assert.equal(result.status, 201);
      cookies.push(result.cookie);
    }
    const [a, b] = cookies;
    const { data: { categories } } = await request("/api/categories", "GET", a);
    const payload = { name: "Stars test jacket", categoryId: categories[0].id, size: "M" };
    const createdA = await request("/api/items", "POST", a, payload);
    const createdB = await request("/api/items", "POST", b, payload);
    assert.equal(createdA.status, 201);
    assert.equal(createdB.status, 201);
    const itemA = createdA.data.item.id;
    const itemB = createdB.data.item.id;
    assert.equal(createdA.data.item.starred, false);
    assert.deepEqual((await request("/api/items?starred=true", "GET", a)).data.items, []);

    const repeated = await Promise.all(Array.from({ length: 5 }, () =>
      request(`/api/items/${itemA}/star`, "PUT", a, { userId: -1 })));
    for (const result of repeated) {
      assert.equal(result.status, 200);
      assert.equal(result.data.starred, true);
    }
    assert.equal((await pool.query(
      "SELECT count(*)::int AS count FROM stars WHERE item_id = $1", [itemA],
    )).rows[0].count, 1);
    assert.equal((await request(`/api/items/${itemA}`, "GET", a)).data.item.starred, true);
    assert.equal((await request("/api/items", "GET", a)).data.items[0].starred, true);
    assert.deepEqual((await request("/api/items?starred=true", "GET", a)).data.items.map((item) => item.id), [itemA]);

    // Another user cannot read, add, or remove this star.
    assert.equal((await request(`/api/items/${itemA}`, "GET", b)).status, 404);
    assert.equal((await request(`/api/items/${itemA}/star`, "PUT", b)).status, 404);
    assert.equal((await request(`/api/items/${itemA}/star`, "DELETE", b)).status, 404);
    assert.deepEqual((await request("/api/items?starred=true", "GET", b)).data.items, []);
    assert.equal((await request(`/api/items/${itemA}`, "GET", a)).data.item.starred, true);
    assert.equal((await request(`/api/items/${itemB}/star`, "PUT", b)).status, 200);
    assert.deepEqual((await request("/api/items?starred=true", "GET", b)).data.items.map((item) => item.id), [itemB]);
    assert.deepEqual((await request("/api/items?starred=true&userId=999", "GET", a)).data.items.map((item) => item.id), [itemA]);

    for (let i = 0; i < 2; i++) {
      const removed = await request(`/api/items/${itemA}/star`, "DELETE", a);
      assert.equal(removed.status, 200);
      assert.equal(removed.data.starred, false);
    }
    assert.equal((await request(`/api/items/${itemA}`, "GET", a)).data.item.starred, false);
    assert.deepEqual((await request("/api/items?starred=true", "GET", a)).data.items, []);
    assert.equal((await request(`/api/items/${itemA}/star`, "PUT", a)).status, 200);
    assert.equal((await request(`/api/items/${itemA}`, "DELETE", a)).status, 200);
    assert.equal((await pool.query(
      "SELECT count(*)::int AS count FROM stars WHERE item_id = $1", [itemA],
    )).rows[0].count, 0);
    assert.equal((await request(`/api/items/${itemA}/star`, "PUT", a)).status, 404);
    assert.equal((await request("/api/items/bad-id/star", "PUT", a)).status, 404);
    assert.equal((await request("/api/items/bad-id/star", "DELETE", a)).status, 404);
  } finally {
    for (const cookie of cookies) {
      await request("/api/auth/logout", "POST", cookie).catch(() => {});
    }
    // Only remove accounts created by this test. Item/star rows cascade.
    try {
      await pool.query("DELETE FROM users WHERE email = ANY($1::text[])", [emails]);
    } finally {
      await pool.end();
    }
  }
});
