import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import pg from "pg";

test("dashboard totals, per-item average, monthly wears, and user isolation", {
  skip: !process.env.TEST_BASE_URL,
}, async () => {
  const base = process.env.TEST_BASE_URL;
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const emails = [0, 1].map((index) => `dashboard-${randomUUID()}-${index}@example.invalid`);
  const cookies = [];
  async function call(path, method = "GET", cookie, body) {
    const response = await fetch(base + path, {
      method, headers: { ...(cookie ? { cookie } : {}), ...(body ? { "Content-Type": "application/json" } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return { status: response.status, data: await response.json(), cookie: response.headers.get("set-cookie")?.split(";")[0] };
  }
  try {
    assert.equal((await call("/api/dashboard")).status, 401);
    for (const source of ["/src/Closet.jsx", "/src/Dashboard.jsx"]) {
      assert.equal((await fetch(base + source)).status, 200);
    }
    for (const email of emails) {
      const signup = await call("/api/auth/signup", "POST", undefined, { email, password: "Dashboard-test-2026!" });
      assert.equal(signup.status, 201);
      cookies.push(signup.cookie);
    }
    const [a, b] = cookies;
    const getDashboard = async (cookie) => (await call("/api/dashboard", "GET", cookie)).data.dashboard;
    const empty = { totalItems: 0, totalClosetValue: 0, averageCostPerWear: null, wearsByMonth: [] };
    assert.deepEqual(await getDashboard(a), empty);
    const categoryId = (await call("/api/categories", "GET", a)).data.categories[0].id;
    async function addItem(cookie, price, dates) {
      const created = await call("/api/items", "POST", cookie, { name: "Dashboard test item", size: "M", categoryId, price });
      assert.equal(created.status, 201);
      for (const wornOn of dates) {
        assert.equal((await call(`/api/items/${created.data.item.id}/wears`, "POST", cookie, { wornOn, occasion: "Test event" })).status, 201);
      }
    }
    await addItem(a, 120, ["2026-01-01", "2026-01-10", "2026-02-01"]);
    await addItem(a, 60, ["2026-02-10"]);
    let dashboard = await getDashboard(a);
    assert.equal(dashboard.totalItems, 2);
    assert.equal(dashboard.totalClosetValue, 180);
    assert.equal(dashboard.averageCostPerWear, 50); // (120 / 3 + 60 / 1) / 2
    assert.deepEqual(dashboard.wearsByMonth, [{ month: "2026-01", wears: 2 }, { month: "2026-02", wears: 2 }]);
    await addItem(a, 20, []); // Counts in value, not in cost-per-wear average.
    await addItem(a, "", ["2026-03-01"]); // Counts in wears, not in average.
    dashboard = await getDashboard(a);
    assert.equal(dashboard.totalItems, 4);
    assert.equal(dashboard.totalClosetValue, 200);
    assert.equal(dashboard.averageCostPerWear, 50);
    assert.deepEqual(dashboard.wearsByMonth[2], { month: "2026-03", wears: 1 });
    assert.deepEqual(await getDashboard(b), empty);
    await addItem(b, 999, ["2025-12-01"]);
    assert.deepEqual(await getDashboard(a), dashboard);
    assert.equal((await getDashboard(b)).averageCostPerWear, 999);
    await addItem(a, 0, ["2026-03-02"]); // A zero price is present, not missing.
    assert.ok(Math.abs((await getDashboard(a)).averageCostPerWear - 100 / 3) < 1e-10);
  } finally {
    for (const cookie of cookies) await call("/api/auth/logout", "POST", cookie).catch(() => {});
    try {
      await pool.query("DELETE FROM users WHERE email = ANY($1::text[])", [emails]);
    } finally {
      await pool.end();
    }
  }
});
