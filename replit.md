# Borrowed on Replit

## Running the app

- The development workflow runs the React app and Express API together with `npm run dev` on port 5000.
- The production server starts with `npm start` after `npm run build`.
- The app uses Replit PostgreSQL through `DATABASE_URL` and requires `SESSION_SECRET` in Replit Secrets.

## Database schema

`server/schema.sql` is the schema source for the `users` and `user_sessions` tables. Apply it to the development PostgreSQL database when setting up a fresh environment. The app intentionally does not create or alter tables when it starts.

## Authentication scope

Accounts use email and bcrypt-hashed passwords. Express sessions are stored in PostgreSQL. Replit Auth and Clerk are not used.
