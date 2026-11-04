import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import pg from "pg";

// Reuse the existing API-test setup: a running development app, unique
// test accounts, session cookies, and PostgreSQL cleanup.
const base = process.env.TEST_BASE_URL || "http://127.0.0.1:5000";
const password = "Plan-test-password-2026!";

function setup(t) {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const emails = [];
  const cookies = [];

  async function request(path, method = "GET", cookie, body) {
    let response;
    try {
      response = await fetch(base + path, {
        method,
        headers: {
          ...(cookie ? { cookie } : {}),
          ...(body ? { "Content-Type": "application/json" } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      throw new Error("Cannot reach the test app. Start it with npm run dev, then run npm test.");
    }
    return {
      status: response.status,
      data: await response.json(),
      cookie: response.headers.get("set-cookie")?.split(";")[0],
    };
  }

  t.after(async () => {
    for (const cookie of cookies) {
      await request("/api/auth/logout", "POST", cookie).catch(() => {});
    }
    try {
      // Restrict cleanup to accounts made by this test. Item, wear, and star
      // rows cascade; remove sessions too, even if logout failed.
      await pool.query(
        `WITH targets AS (
          SELECT id FROM users WHERE email = ANY($1::text[])
        ), removed_sessions AS (
          DELETE FROM user_sessions
          WHERE sess->>'userId' IN (SELECT id::text FROM targets)
          RETURNING sid
        )
        DELETE FROM users WHERE id IN (SELECT id FROM targets)`,
        [emails],
      );
    } finally {
      await pool.end();
    }
  });

  async function createUser() {
    const email = `plan-test-${randomUUID()}@example.invalid`;
    emails.push(email);
    const signup = await request("/api/auth/signup", "POST", undefined, { email, password });
    if (signup.cookie) cookies.push(signup.cookie);
    assert.equal(signup.status, 201, "Test account should be created");
    assert.equal((await request("/api/auth/logout", "POST", signup.cookie)).status, 200);
    const login = await request("/api/auth/login", "POST", undefined, { email, password });
    if (login.cookie) cookies.push(login.cookie);
    assert.equal(login.status, 200, "Test account should log in");
    assert.ok(login.cookie, "Login should create a session");
    return login.cookie;
  }

  async function addItem(cookie, name, price = "") {
    const categories = await request("/api/categories", "GET", cookie);
    assert.equal(categories.status, 200);
    const result = await request("/api/items", "POST", cookie, {
      name, price, size: "M", categoryId: categories.data.categories[0].id,
    });
    assert.equal(result.status, 201, `${name} should be created`);
    return result.data.item;
  }

  return { request, createUser, addItem };
}

test("data isolation", async (t) => {
  const { request, createUser, addItem } = setup(t);
  const userA = await createUser();
  const item = await addItem(userA, "Black slip dress");
  assert.equal(item.name, "Black slip dress");
  const userB = await createUser();

  const closet = await request("/api/items", "GET", userB);
  assert.equal(closet.status, 200);
  assert.deepEqual(closet.data.items, [], "User B's closet must be empty");

  const otherUsersItem = await request(`/api/items/${item.id}`, "GET", userB);
  assert.equal(otherUsersItem.status, 404, "User B must not open User A's item");
  assert.match(otherUsersItem.data.error, /not found/i);
});

test("dashboard average cost per wear", async (t) => {
  const { request, createUser, addItem } = setup(t);
  const user = await createUser();
  const jacket = await addItem(user, "Jacket", 120);
  const dress = await addItem(user, "Dress", 60);

  for (const [item, dates] of [
    [jacket, ["2026-01-01", "2026-01-02", "2026-01-03"]],
    [dress, ["2026-01-04"]],
  ]) {
    for (const wornOn of dates) {
      const result = await request(`/api/items/${item.id}/wears`, "POST", user, {
        wornOn, occasion: "Test event",
      });
      assert.equal(result.status, 201, "Wear should be logged");
    }
  }

  const result = await request("/api/dashboard", "GET", user);
  assert.equal(result.status, 200);
  assert.equal(result.data.dashboard.averageCostPerWear, 50, "(120 ÷ 3 + 60 ÷ 1) ÷ 2 = 50");
  assert.equal(result.data.dashboard.averageCostPerWear.toFixed(2), "50.00");
});
