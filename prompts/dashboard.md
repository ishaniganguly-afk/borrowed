# Prompt log: Feature 8 (Dashboard)

## Prompt 1
Read PLAN.md. Build ONLY feature 8 (dashboard).
- Add a "Dashboard" page linked from the top navigation.
- Show a bar chart of the user's wears per month, using Recharts.
- Show three stats: total items, total closet value (sum of prices), and average cost per wear. Average cost per wear = the average of each item's (price ÷ number of wears), counting only items that have a price and at least one wear.
- Only use the signed-in user's own data.
- Keep the existing styling. Don't build any other features.
- Stay on the current branch. Do not switch branches, push, or merge.
- Skip production build checks and screenshots. Do one quick test of the feature, then stop.
When done, tell me what you changed.

## Agent response (summary)
- Added Dashboard to the top navigation, a Recharts bar chart of wears per month, and stats for total items, total closet value, and average cost per wear.
- Average cost per wear excludes items without a price or without wears. All calculations use only the signed-in user's data.
- One quick test passed, covering my plan's example ($120 jacket worn 3 times + $60 dress worn once = $50.00 average), monthly totals, empty data, and account isolation.