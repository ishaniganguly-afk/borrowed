# Prompt log: Feature 10 (Public lending closet link)

## Prompt 1
Read PLAN.md. Build ONLY feature 10 (public lending closet link).
- Give each user a unique `share_slug` (in the users table) the first time they need one.
- On My Closet, add a "Share my lending closet" button that shows the user's public link and a "Copy link" button.
- The public page at `/c/<share_slug>` works without logging in. It shows ONLY that user's items marked "available to lend" (name, category, brand, size, color, fit notes). No prices, no email, no edit buttons, and no items that aren't marked available to lend.
- An unknown link shows a friendly "Closet not found" page.
- Keep the existing styling. Don't build any other features.
- Stay on the current branch. Do not switch branches, push, or merge.
- Skip production build checks and screenshots. Do one quick test, including that items not marked "available to lend" never appear on the public page, then stop.
When done, tell me what you changed.

## Agent response (summary)
- Added "Share my lending closet" and "Copy link" on My Closet. A unique share_slug is created on first use and reused after.
- Added a public page at /c/<share_slug> that works without logging in and shows only the owner's lendable items (name, category, brand, size, color, fit notes). No prices, email, private items, or edit controls.
- The public API uses a separate list of allowed fields and checks "available to lend" on every request.
- Unknown links show "Closet not found."
- One quick test passed: private items and other users' items never appear, sensitive fields are excluded, and unmarking an item removes it from the public page.