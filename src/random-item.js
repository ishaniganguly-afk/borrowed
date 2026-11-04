export function pickRandomItem(items, previousId, random = Math.random) {
  if (!items.length) return null;
  const choices = items.length > 1
    ? items.filter((item) => item.id !== previousId)
    : items;
  return choices[Math.floor(random() * choices.length)];
}
