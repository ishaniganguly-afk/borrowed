export function findClosetItems(items, {
  query = "", categoryId = "", availableOnly = false, sort = "newest", starredOnly = false,
} = {}) {
  const search = query.trim().toLowerCase();
  const matches = items.filter((item) =>
    (!starredOnly || item.starred) &&
    (!search || item.name.toLowerCase().includes(search) ||
      (item.brand || "").toLowerCase().includes(search)) &&
    (!categoryId || String(item.categoryId) === String(categoryId)) &&
    (!availableOnly || item.availableToLend));

  return matches.sort((a, b) => {
    if (sort === "most-worn") {
      const difference = (b.wearCount ?? 0) - (a.wearCount ?? 0);
      if (difference) return difference;
    }
    if (sort === "price-asc" || sort === "price-desc") {
      const aMissing = a.price === "" || a.price == null;
      const bMissing = b.price === "" || b.price == null;
      if (aMissing !== bMissing) return aMissing ? 1 : -1;
      if (!aMissing) {
        const difference = Number(a.price) - Number(b.price);
        if (difference) return sort === "price-asc" ? difference : -difference;
      }
    }
    return b.createdAt.localeCompare(a.createdAt) || b.id - a.id;
  });
}
