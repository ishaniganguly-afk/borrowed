# Borrowed

A closet tracker with a shareable lending closet. Log the clothes you own, record what you wore to which event, see cost per wear, and share a read-only link of the pieces you're happy to lend to friends.

**Live app:** https://borrowed-ishaniganguly.replit.app/

## Features
- Sign up, log in, and log out (email and password)
- Add, view, edit, and delete closet items, with validation
- Star favorites and view them in a Starred list
- Search, filter by category or "available to lend," and sort by newest, price, or most worn
- Wear log with cost per wear
- Dashboard: wears-per-month chart, total items, total closet value, and average cost per wear
- "Pick for me" random outfit button
- Public lending closet link at /c/<share_slug>

## Tools
- Coding agent: Replit Agent
- App: React front end, Node/Express back end
- Database: Replit PostgreSQL
- Login: email and password with bcrypt hashing and sessions
- Charts: Recharts
- Hosting: Replit Deployments (Autoscale)

## How to run it
1. Import this repo into Replit (Create → Import → GitHub).
2. Click **Run**. Replit installs dependencies and starts the app with `npm run dev`.
3. To run the tests: `npm test`.
4. To publish: build with `npm run build` and start with `npm start` (already set up in `.replit`).

## Docs
- PLAN.md: original plan, plus Plan vs. Reality
- schema.md: database tables
- prompts/: prompt log for each feature
