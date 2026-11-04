# Prompt log: Feature 7 (Wear log)

## Prompt 1
Read PLAN.md. Build ONLY feature 7 (wear log).
- Create the `wears` table exactly as in PLAN.md section 3 (item_id, user_id, worn_on, occasion).
- On each item's detail page, add a "Log a wear" form with a date and an event (for example, "Yosemite trip"), and show that item's wear history, newest first, with the option to delete a wear.
- Show each item's wear count and cost per wear (price ÷ number of wears) on its detail page. Leave cost per wear blank if the item has no price or no wears.
- Add "most worn" to the sort options on My Closet.
- Users can only log, see, or delete wears for their own items. Enforce this on the server.
- Keep the existing styling. Don't build any other features.
- Stay on the current branch. Do not switch branches, push, or merge.
- Skip production build checks and screenshots. Do one quick test of the feature, then stop.
When done, tell me what you changed.

## Agent response (summary)
- Added the `wears` table, a "Log a wear" form (date and event), and wear history (newest first) with delete.
- Wear count and cost per wear update after adding or deleting a wear. Cost per wear stays blank with no price or no wears.
- Added "most worn" sorting, including in Starred.
- The server blocks viewing, logging, or deleting wears on another user's items.
- One quick automated test passed (logging, history order, calculations, deletion, sorting, ownership).

## Issue caught
I sent this prompt while still on `15-find-things`, a branch that was already merged, instead of the new Wear log branch. The Agent built there. Before pushing, I moved the work to a new `wear-log` branch with `git checkout -b wear-log`.
