import test from "node:test";
import assert from "node:assert/strict";
import { todayDate, validateItem } from "../shared/item-validation.js";

const valid = { name: "Linen shirt", categoryId: 2, size: "M", price: "" };

test("purchase date is optional, allows today and past dates, and rejects future dates", () => {
  const today = todayDate();
  const tomorrow = new Date(`${today}T00:00:00Z`);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const yesterday = new Date(`${today}T00:00:00Z`);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);

  for (const purchasedOn of [undefined, null, "", "  ", today, yesterday.toISOString().slice(0, 10)]) {
    assert.deepEqual(validateItem({ ...valid, purchasedOn }, [1, 2]), {});
  }
  assert.equal(
    validateItem({ ...valid, purchasedOn: tomorrow.toISOString().slice(0, 10) }, [1, 2]).purchasedOn,
    "Purchase date can’t be in the future",
  );
});

test("required fields reject missing and whitespace-only values", () => {
  assert.deepEqual(Object.keys(validateItem({})), ["name", "categoryId", "size"]);
  assert.deepEqual(Object.keys(validateItem({ name: "  ", categoryId: " ", size: "\t" })),
    ["name", "categoryId", "size"]);
});

test("price is optional and zero or positive prices are allowed", () => {
  for (const price of ["", "  ", null, undefined, 0, "0", 12.5, "12.50"]) {
    assert.deepEqual(validateItem({ ...valid, price }, [1, 2]), {});
  }
});

test("negative and invalid prices are rejected", () => {
  for (const price of [-1, "-0.01", "nonsense", "NaN", Infinity, false, [], {}]) {
    assert.ok(validateItem({ ...valid, price }).price);
  }
});

test("invalid or unavailable categories are rejected", () => {
  for (const categoryId of [null, undefined, "", 0, -1, 1.5, "bad", true, [], 99, 2147483648]) {
    assert.ok(validateItem({ ...valid, categoryId }, [1, 2]).categoryId);
  }
});

test("malformed required fields and payloads do not bypass validation", () => {
  for (const input of [null, [], "bad", { ...valid, name: 7, size: {} }]) {
    assert.ok(validateItem(input).name);
    assert.ok(validateItem(input).size);
  }
});
