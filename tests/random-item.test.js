import test from "node:test";
import assert from "node:assert/strict";
import { pickRandomItem } from "../src/random-item.js";
import { findClosetItems } from "../src/closet-filters.js";

test("random pick respects the current category, rerolls, and handles empty or single-item closets", async () => {
  const ownItems = [
    { id: 1, name: "Dress", categoryId: 1, createdAt: "2026-01-01" },
    { id: 2, name: "Top", categoryId: 2, createdAt: "2026-01-02" },
    { id: 3, name: "Another dress", categoryId: 1, createdAt: "2026-01-03" },
  ];
  const candidates = findClosetItems(ownItems, { categoryId: "1" });
  const first = pickRandomItem(candidates, null, () => 0);
  assert.equal(first.categoryId, 1);
  const again = pickRandomItem(candidates, first.id, () => 0.99);
  assert.equal(again.categoryId, 1);
  assert.notEqual(again.id, first.id);
  assert.ok(ownItems.includes(first) && ownItems.includes(again));
  assert.equal(pickRandomItem([], null), null);
  assert.equal(pickRandomItem(findClosetItems(ownItems, { categoryId: "99" }), null), null);
  assert.equal(pickRandomItem([ownItems[0]], ownItems[0].id).id, 1);
  assert.equal(pickRandomItem(ownItems, null, () => 0.999).id, 3);
  if (process.env.TEST_BASE_URL) {
    for (const source of ["/src/PickForMe.jsx", "/src/Closet.jsx"]) {
      const response = await fetch(process.env.TEST_BASE_URL + source);
      assert.equal(response.status, 200, "Development server should transform the changed JSX");
    }
  }
});
