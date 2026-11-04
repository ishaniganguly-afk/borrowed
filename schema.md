# schema.md: Borrowed

## Tables

| Table | Columns | Purpose |
|---|---|---|
| **users** | id (PK), email (unique), password_hash, display_name, share_slug (unique), created_at | One row per account. Passwords are stored only as bcrypt hashes. |
| **categories** | id (PK), name (unique) | Fixed list: Dresses, Tops, Bottoms, Outerwear, Shoes, Accessories. |
| **items** | id (PK), user_id (FK → users), category_id (FK → categories), name, brand, size, color, price, purchased_on, fit_notes, photo_url, available_to_lend, created_at | The main table: each piece of clothing. |
| **wears** | id (PK), item_id (FK → items), user_id (FK → users), worn_on, occasion | One row each time an item is worn. |
| **stars** | id (PK), user_id (FK → users), item_id (FK → items), created_at | Junction table. One star per user per item (unique on user_id + item_id). |
| **user_sessions** | session id, session data, expiry | Login sessions, added by the agent. Not in my original plan. |

## How they connect
- users → items: one-to-many (a user owns many items)
- categories → items: one-to-many (a category holds many items)
- items → wears: one-to-many (an item is worn many times)
- users ↔ items through stars: many-to-many

## Compared with PLAN.md section 3
The agent built the five planned tables as designed. Differences:
- It added a `user_sessions` table to store logins, which I hadn't planned.
- `photo_url` exists but is unused, because photo upload was cut for time and replaced with the random outfit pick.