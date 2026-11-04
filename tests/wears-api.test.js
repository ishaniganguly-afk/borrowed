import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { findClosetItems } from "../src/closet-filters.js";

test("wear log, cost per wear, most-worn sorting, and ownership", {
  skip: !process.env.TEST_BASE_URL,
}, async () => {
  const base = process.env.TEST_BASE_URL;
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const emails = [0, 1].map((index) => `wear-${randomUUID()}-${index}@example.invalid`);
  const cookies = [];
  async function call(path, method = "GET", cookie, body) {
    const response = await fetch(base + path, {
      method,
      headers: { ...(cookie ? { cookie } : {}), ...(body ? { "Content-Type": "application/json" } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return { status: response.status, data: await response.json(), cookie: response.headers.get("set-cookie")?.split(";")[0] };
  }
  try {
    // Ask the development server to transform the changed JSX without a build.
    for (const source of ["/src/Closet.jsx", "/src/WearLog.jsx"]) {
      assert.equal((await fetch(base + source)).status, 200);
    }
    for (const email of emails) {
      const signup = await call("/api/auth/signup", "POST", undefined, { email, password: "Wear-test-password-2026!" });
      assert.equal(signup.status, 201);
      cookies.push(signup.cookie);
    }
    const [a, b] = cookies;
    const categoryId = (await call("/api/categories", "GET", a)).data.categories[0].id;
    const create = async (price) => {
      const result = await call("/api/items", "POST", a, { name: "Wear test jacket", size: "M", categoryId, price });
      assert.equal(result.status, 201);
      return result.data.item;
    };
    const item = await create(120);
    const unpriced = await create("");
    assert.equal(item.wearCount, 0);
    assert.equal(item.costPerWear, null);
    const wearIds = [];
    for (const wornOn of ["2026-01-01", "2026-03-01", "2026-02-01"]) {
      const result = await call(`/api/items/${item.id}/wears`, "POST", a, { wornOn, occasion: "Yosemite trip", userId: -1 });
      assert.equal(result.status, 201);
      wearIds.push(result.data.wear.id);
    }
    const history = await call(`/api/items/${item.id}/wears`, "GET", a);
    assert.deepEqual(history.data.wears.map((wear) => wear.wornOn), ["2026-03-01", "2026-02-01", "2026-01-01"]);
    let detail = (await call(`/api/items/${item.id}`, "GET", a)).data.item;
    assert.equal(detail.wearCount, 3);
    assert.equal(detail.costPerWear, 40);
    assert.equal((await call(`/api/items/${item.id}/wears`, "GET", b)).status, 404);
    assert.equal((await call(`/api/items/${item.id}/wears`, "POST", b, { wornOn: "2026-01-01", occasion: "Not mine" })).status, 404);
    assert.equal((await call(`/api/items/${item.id}/wears/${wearIds[0]}`, "DELETE", b)).status, 404);
    assert.equal((await call(`/api/items/${unpriced.id}/wears/${wearIds[0]}`, "DELETE", a)).status, 404);
    assert.equal((await call(`/api/items/${item.id}/wears`, "POST", a, { wornOn: "2026-02-30", occasion: "Invalid" })).status, 400);
    assert.equal((await call(`/api/items/${item.id}/wears`)).status, 401);
    await call(`/api/items/${unpriced.id}/wears`, "POST", a, { wornOn: "2026-04-01", occasion: "Dinner" });
    assert.equal((await call(`/api/items/${unpriced.id}`, "GET", a)).data.item.costPerWear, null);
    const all = (await call("/api/items", "GET", a)).data.items;
    assert.deepEqual(findClosetItems(all, { sort: "most-worn" }).map((entry) => entry.id), [item.id, unpriced.id]);
    await call(`/api/items/${item.id}/star`, "PUT", a);
    const starred = (await call("/api/items?starred=true", "GET", a)).data.items;
    assert.equal(findClosetItems(starred, { sort: "most-worn", starredOnly: true })[0].wearCount, 3);
    assert.equal((await call(`/api/items/${item.id}/wears/${wearIds[0]}`, "DELETE", a)).status, 200);
    detail = (await call(`/api/items/${item.id}`, "GET", a)).data.item;
    assert.equal(detail.wearCount, 2);
    assert.equal(detail.costPerWear, 60);
    for (const wearId of wearIds.slice(1)) {
      await call(`/api/items/${item.id}/wears/${wearId}`, "DELETE", a);
    }
    detail = (await call(`/api/items/${item.id}`, "GET", a)).data.item;
    assert.equal(detail.wearCount, 0);
    assert.equal(detail.costPerWear, null);
  } finally {
    for (const cookie of cookies) await call("/api/auth/logout", "POST", cookie).catch(() => {});
    try {
      await pool.query("DELETE FROM users WHERE email = ANY($1::text[])", [emails]);
    } finally {
      await pool.end();
    }
  }
});
