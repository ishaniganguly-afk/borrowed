# Borrowed on Replit

## Running the app

- The development workflow runs the React app and Express API together with `npm run dev` on port 5000.
- The production server starts with `npm start` after `npm run build`.
- The app uses Replit PostgreSQL through `DATABASE_URL` and requires `SESSION_SECRET` in Replit Secrets.

## Database schema

`server/schema.sql` is the schema source for the `users`, `user_sessions`, `categories`, `items`, and `stars` tables. It seeds the six planned categories. Apply it to the development PostgreSQL database when setting up a fresh environment. The app intentionally does not create or alter tables when it starts.

Each item references its owner in `users` and its category in `categories`. The API always scopes item operations to the signed-in user's ID.

Stars are stored in one shared table with a unique `(user_id, item_id)` pair. Star/unstar requests only work for items owned by the signed-in user, and deleting an item removes its stars.

## Authentication scope

Accounts use email and bcrypt-hashed passwords. Express sessions are stored in PostgreSQL. Replit Auth and Clerk are not used.
