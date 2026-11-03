# Prompt log: Features 2 and 3 (Data model + CRUD)

## Prompt 1
Read PLAN.md in the repo root. Build ONLY features 2 and 3 (data model, and create/read/update/delete for closet items).

Requirements:
- Create the `categories` and `items` tables exactly as defined in PLAN.md section 3. Seed categories with: Dresses, Tops, Bottoms, Outerwear, Shoes, Accessories.
- Each item belongs to the logged-in user. A user can only see, open, edit, or delete their own items. Enforce this on the server, and return "not found" if someone requests another user's item by ID.
- The My Closet page shows the user's items as a grid of cards (name, category, brand, size) with an "Add item" button.
- The add/edit form has: name, category (dropdown), brand, size, color, price, purchase date, fit notes, and an "available to lend" checkbox. Skip the photo for now.
- Clicking an item opens its detail page, with Edit and Delete buttons. Delete shows an "Are you sure?" confirmation first.
- Don't add custom validation messages yet. That's the next feature.
- Keep the existing styling and colors.
- Stay on the current branch. Do not switch branches, push, or merge.

When you're done, explain in plain English how items connect to users and categories in the database.

## Agent response (summary)
- Added the `categories` and `items` tables and seeded the six categories.
- Every item query is scoped to the signed-in user. Requests for another user's item by ID return 404 Not Found. The Agent tested read, edit, and delete across two accounts.
- users → items: each item's user_id points to its owner. categories → items: each item's category_id points to one category.
- The items table includes the planned photo_url column, but no photo upload yet.
- The preview screenshot could only show the signed-out page, so the Agent verified the signed-in flows with API tests instead. I tested them manually in the preview.