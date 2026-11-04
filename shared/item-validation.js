export function todayDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function validateItem(input, categoryIds) {
  const item = input && typeof input === "object" ? input : {};
  const errors = {};

  if (typeof item.name !== "string" || !item.name.trim()) {
    errors.name = "Please add a name";
  }

  const categoryId = ["string", "number"].includes(typeof item.categoryId)
    ? Number(item.categoryId)
    : NaN;
  if (!Number.isSafeInteger(categoryId) || categoryId <= 0 || categoryId > 2147483647 ||
      (categoryIds && !categoryIds.includes(categoryId))) {
    errors.categoryId = "Please choose a category";
  }

  if (typeof item.size !== "string" || !item.size.trim()) {
    errors.size = "Please add a size";
  }

  const price = typeof item.price === "string" ? item.price.trim() : item.price;
  if (price !== "" && price != null) {
    if (!["string", "number"].includes(typeof price) || !Number.isFinite(Number(price))) {
      errors.price = "Please enter a valid price";
    } else if (Number(price) < 0) {
      errors.price = "Price can’t be negative";
    }
  }

  const purchasedOn = typeof item.purchasedOn === "string" ? item.purchasedOn.trim() : "";
  if (purchasedOn && Date.parse(purchasedOn) > Date.parse(todayDate())) {
    errors.purchasedOn = "Purchase date can’t be in the future";
  }

  return errors;
}
