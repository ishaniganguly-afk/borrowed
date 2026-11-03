# Prompt log: Feature 1 (Sign up and login)

## Prompt 1
Read PLAN.md in the repo root. It is my plan for this app. Build ONLY feature 1 (sign up and login) for now.

Requirements:
- Use a React front end with a Node/Express back end and Replit's built-in PostgreSQL.
- Build email and password auth myself, with passwords hashed using bcrypt and session-based login. Do NOT use Replit Auth or Clerk.
- Create the users table exactly as defined in PLAN.md section 3. Every account must be a row in this table.
- A new visitor can sign up from inside the app, log in, and log out. No email verification step.
- After login, show a simple placeholder "My Closet" page with the user's email and a logout button.
- Use the colors from PLAN.md section 6.
- Do not build any other features yet.
- Stay on the current branch. Do not switch branches, push, or merge.

When you're done, explain in plain English how sign up and login work and where user data is stored.

## Agent response (summary)
- Built sign up, login, and logout. After login, the page shows "My Closet," the user's email, and a logout button.
- Passwords are hashed with bcrypt. No email verification, Replit Auth, or Clerk.
- Accounts are stored in the PostgreSQL `users` table with the planned columns (id, email, password_hash, display_name, share_slug, created_at). display_name and share_slug start empty.
- Login sessions are stored in a separate `user_sessions` table. The browser gets a session cookie, not the password.

## Issue caught
The Agent reported it couldn't find PLAN.md. The plan file had been uploaded as `borrowed.md`, so the Agent used that file instead. I renamed it to PLAN.md in a separate PR (Issue #4).