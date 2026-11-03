import test from "node:test";
import assert from "node:assert/strict";
import { findClosetItems } from "../src/closet-filters.js";

test("search, category, lending and sorting combine in All items and Starred", () => {
  const items = [
    { id: 1, name: "Blue dress", brand: "Acme", categoryId: 1, availableToLend: true, starred: true, price: 80, createdAt: "2026-01-01" },
    { id: 2, name: "Jacket", brand: "ACME", categoryId: 2, availableToLend: true, starred: true, price: 100, createdAt: "2026-01-03" },
    { id: 3, name: "Red dress", brand: null, categoryId: 1, availableToLend: false, starred: true, price: 20, createdAt: "2026-01-02" },
    { id: 4, name: "Acme dress", brand: "", categoryId: 1, availableToLend: true, starred: false, price: 30, createdAt: "2026-01-04" },
    { id: 5, name: "Free dress", brand: "Acme", categoryId: 1, availableToLend: true, starred: true, price: 0, createdAt: "2026-01-05" },
    { id: 6, name: "Priceless dress", brand: "Acme", categoryId: 1, availableToLend: true, starred: true, price: "", createdAt: "2026-01-06" },
  ];
  const ids = (options) => findClosetItems(items, options).map((item) => item.id);
  assert.deepEqual(ids(), [6, 5, 4, 2, 3, 1]);
  assert.deepEqual(ids({ query: "  DRESS " }), [6, 5, 4, 3, 1]);
  const combined = { query: "acme", categoryId: "1", availableOnly: true, sort: "price-asc" };
  assert.deepEqual(ids(combined), [5, 4, 1, 6]);
  assert.deepEqual(ids({ ...combined, starredOnly: true }), [5, 1, 6]);
  assert.deepEqual(ids({ ...combined, sort: "price-desc" }), [1, 4, 5, 6]);
  assert.deepEqual(ids({ ...combined, sort: "price-desc", starredOnly: true }), [1, 5, 6]);
  assert.deepEqual(ids({ ...combined, sort: "newest", starredOnly: true }), [6, 5, 1]);
  assert.deepEqual(ids({ query: "not here", starredOnly: true }), []);
  assert.deepEqual(items.map((item) => item.id), [1, 2, 3, 4, 5, 6]);
});
