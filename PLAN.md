# PLAN.md: Borrowed

## 1. Pitch

I'm building **Borrowed**, a closet tracker with a shareable lending closet, because my first month at Haas had a Vegas trip, a Yosemite trip, and a football game, and I kept buying new outfits without knowing what I already owned or what friends could lend me. I want to see what I own, what I wore to which event, what each piece really costs per wear, and share the pieces I'm happy to lend.

I'll use it 2–3 times a week: logging what I wore after events and checking my closet before buying anything new.

## 2. Features

Numbered in the order I'll build them. Features 1–6 and 8 are the required spine; 7, 9, and 10 are mine.

1. **Sign up and login** (spine): As a student, I want to create an account with my email and a password, then log in and out, so that my closet is private to me.
2. **Data model** (spine): As a user, I want my items grouped into categories (Dresses, Tops, Bottoms, Outerwear, Shoes, Accessories), so that I can browse my closet by type.
3. **Create / read / update / delete** (spine): As a user, I want to add an item with its name, category, brand, size, color, price, purchase date, and fit notes, see my full closet, open one item's page, edit it, and delete it after an "Are you sure?" prompt, so that my closet stays accurate.
4. **Validation** (spine): As a user, I want a friendly message if I leave the name, category, or size blank, or enter a negative price, so that I don't save broken items.
5. **Stars** (spine): As a user, I want to star my go-to pieces and see them in a "Starred" view, so that I can find my favorites fast.
6. **Find things** (spine): As a user, I want to search by name or brand, filter by category or "available to lend," and sort by newest, price, or most worn, so that I can find the right piece quickly.
7. **Wear log** (mine): As a user, I want to log each time I wear an item with the date and the event (e.g., "Yosemite trip"), so that I can see what I wore where and calculate cost per wear.
8. **Dashboard** (spine): As a user, I want a chart of wears per month and stats for total items, total closet value, and average cost per wear, so that I can see which purchases were worth it.
9. **Photo upload** (mine): As a user, I want to upload a photo of each item, so that I can recognize it at a glance.
10. **Public lending closet link** (mine): As a user, I want a read-only link I can text to friends that shows only the items I've marked "available to lend," so that friends can see what they could borrow without seeing the rest of my closet.

## 3. Database

| Table | Columns (type) | Notes |
|---|---|---|
| **users** | id (number, PK), email (text, unique), password_hash (text), display_name (text), share_slug (text, unique), created_at (date) | One row per account, created when someone signs up. Passwords are stored only as hashes. |
| **categories** | id (number, PK), name (text, unique) | Fixed list, seeded once. |
| **items** | id (number, PK), user_id (number, FK → users), category_id (number, FK → categories), name (text), brand (text), size (text), color (text), price (number), purchased_on (date), fit_notes (text), photo_url (text), available_to_lend (true/false), created_at (date) | The main table. |
| **wears** | id (number, PK), item_id (number, FK → items), user_id (number, FK → users), worn_on (date), occasion (text) | One row per time an item is worn. |
| **stars** | id (number, PK), user_id (number, FK → users), item_id (number, FK → items), created_at (date) | Junction table. One star per user per item (unique on user_id + item_id). |

How they connect:
- users → items: one-to-many (a user owns many items)
- categories → items: one-to-many (a category holds many items)
- items → wears: one-to-many (an item is worn many times)
- users ↔ items through stars: many-to-many

Cost per wear for an item = price ÷ number of rows in wears for that item. Items with zero wears are left out.

## 4. Tests

1. **Data isolation:** Given User A has added an item called "Black slip dress," when User B logs in and opens their closet, and also tries to open User A's item by its ID, then User B's closet list is empty and the item page returns "not found."
2. **Dashboard:** Given a user has a $120 jacket worn 3 times and a $60 dress worn once, when they open the dashboard, then "average cost per wear" shows **$50.00** (($40 + $60) ÷ 2).

## 5. Technologies

- **Coding agent: Replit Agent.** It builds, runs, and hosts the app in one place, which is the fastest setup for a 3-day build.
- **App: React front end with a Node/Express back end.** This is Replit Agent's default stack, so the agent works fastest in it.
- **Database: Replit's built-in PostgreSQL.** It's a real relational database with no outside account to set up.
- **Sign up and login: email and password built into the app, with passwords hashed by bcrypt.** Every account is a row in my own users table, and new users can sign up instantly during the live demo with no email verification step. I'm not using Replit Auth because it makes users sign in with a Replit account.
- **Photo storage: Replit Object Storage.** It keeps photos in the same project as the app.
- **Hosting: Replit Deployments.** I'll publish from main after every merged PR so the live URL stays current.
- **Charts: Recharts.** It's a simple React charting library for the dashboard.

## 6. Design

Bold and playful, matching my Darwin Day pitch deck: hot pink (#F0437F), butter yellow (#FFD84D), deep plum (#231433), and blush (#FCEAF1), with rounded cards and big headings. The closet view is a photo grid.

Inspiration: **Depop** for the closet grid and item pages, and **Indyx** for the outfit calendar and cost-per-wear stats.

## 7. Risks and cuts

- **Least sure I can build:** the public lending closet link. It has to work without logging in while still never exposing items that aren't marked "available to lend," which is the same data-isolation rule my test checks.
- **Cut first:** photo upload. If storage setup eats too much time, I'll swap it for a plain "photo URL" text field and replace it with a different small feature (a "random outfit pick" button).

## Plan vs. Reality

| Planned feature | Shipped / Changed / Cut | Status | Learning | What changed and why |
|---|---|---|---|---|
| 1. Sign up and login | Shipped | Done | The agent defaults to Replit's own login, so I had to say "no Replit Auth" explicitly. | Built as planned; the agent added a `user_sessions` table I hadn't planned. |
| 2. Data model | Shipped | Done | CRUD needs the tables anyway, so building them together saved a full PR cycle. | Built in the same PR as CRUD. |
| 3. Create / read / update / delete | Shipped | Done | Server-side ownership checks are what make data isolation real. | Built as planned, without the photo field. |
| 4. Validation | Shipped | Done | Form checks alone can be bypassed. | Added matching server-side checks, plus a check for categories that don't exist. |
| 5. Stars | Shipped | Done | A single junction table with a unique pair rule prevents duplicate stars. | Built as planned. |
| 6. Find things | Changed | Done | My feature order had a hidden dependency. | "Most worn" sort moved to the wear log feature, because the wears table didn't exist yet. |
| 7. Wear log | Changed | Done | Always check the branch before prompting the agent. | Also added "most worn" sorting. It was first built on an already-merged branch, and I moved it to a new branch before pushing. |
| 8. Dashboard | Shipped | Done | Writing the exact formula in my plan made the test easy to write. | Built as planned. I linked its Issue after merging. |
| 9. Photo upload | Cut | Backlogged | Planning a fallback ahead of time made the cut an easy decision. | Replaced with the planned fallback, a "Pick for me" random outfit button, to save time on storage setup. The closet shows cards instead of a photo grid. |
| 10. Public lending closet link | Shipped | Done | Keeping a separate list of public fields protects private data. | Built as planned, with no prices or email on the public page. |
| Not planned: deployment setup | Added | Done | Imported projects don't come with production settings. | Publishing was blocked until I added build and start commands in a separate PR. |
| Not planned: plan file rename | Added | Done | Check file names after uploading. | My plan uploaded as `borrowed.md`. I renamed it to PLAN.md in a separate PR. |
