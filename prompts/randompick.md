# Prompt log: Random outfit pick (custom feature, replaces photo upload)

## Why this feature
My plan listed photo upload as a custom feature, with this button as the planned fallback. I cut photo upload for time (storage setup risk) and built this instead.

## Prompt 1
Read PLAN.md. Build ONE feature: a "Pick for me" button on My Closet that shows one random item from the signed-in user's closet (respecting any active category filter), with a link to that item's page and a "Pick again" option. If the closet is empty, show a friendly message. Only use the user's own items. Keep the existing styling. Don't build any other features. Stay on the current branch. Do not switch branches, push, or merge. Skip production build checks and screenshots. Do one quick test, then stop. When done, tell me what you changed.

## Agent response (summary)
- Added "Pick for me" to My Closet. It picks one random item from the current filtered view, including the category filter.
- Shows the item's name as a link to its page, with "Pick again" when there are multiple matches.
- Shows a friendly message when the closet or the filtered results are empty.
- Uses only the user's own items.
- One quick test passed (category filtering, repeat picks, empty results, single-item closets).