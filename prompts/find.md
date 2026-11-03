# Prompt log: Feature 6 (Find things)

## Prompt 1
Read PLAN.md. Build ONLY feature 6 (find things) on My Closet.
- A search box that matches item name or brand.
- Filters for category and "available to lend."
- Sorting by newest and by price (high to low and low to high).
- Search, filter, and sort work together and also work inside the Starred view.
- Skip "most worn" sorting for now. The wears table doesn't exist yet, so it will be added with the wear log feature.
- Keep the existing styling. Don't build any other features.
- Stay on the current branch. Do not switch branches, push, or merge.
- Skip production build checks and screenshots. Do one quick test of the feature, then stop.
When done, tell me what you changed.

## Agent response (summary)
- Search matches name or brand, ignoring capitalization. Filters for category and "available to lend." Sorting by newest and by price; items without a price appear last.
- All controls work together in both All items and Starred, and selections stay when switching views.
- One quick automated test passed.

## Plan vs. reality note
My plan put "sort by most worn" in this feature, but it depends on the wears table from the wear log feature (built later). I moved it to the wear log feature.