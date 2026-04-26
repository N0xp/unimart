# UniMart Auth and Database Diagnostic Report

Date: 2026-04-26

## Summary

The UniMart authentication code path is structurally correct when the UniMart Express server is actually running:

- Frontend registration posts JSON to `POST /api/auth/register`.
- Backend hashes the password with `bcryptjs` and inserts into `users`.
- Frontend login posts JSON to `POST /api/auth/login`.
- Backend verifies the bcrypt password and stores the user in the session.
- Session-backed routes such as `GET /api/auth/check` and `GET /api/users/profile` work after login.

I verified the database connection using the same `db/connection.js` pool used by the app. The app connects to database `unimart` as `root@localhost`, and the required tables exist: `users`, `sessions`, `categories`, `products`, `cart_items`, `orders`, and `order_items`.

## Main Issue Found

`PORT=3000` was configured, but port `3000` is already used by another Node process in this environment:

```text
node /Users/ymz/.npm/_npx/f6829324ff4cde8f/node_modules/.bin/code-assist-mcp
```

Requests to `http://localhost:3000/api/auth/register` returned:

```text
Cannot POST /api/auth/register
```

That means the browser was not reaching the UniMart backend. Account creation and login cannot work when the frontend is pointed at a different process.

The frontend pages use relative API URLs such as `/api/auth/register` and `/api/auth/login`. This is correct only when the pages are opened from the Express server, for example `http://localhost:3001/register.html`. If the pages are opened directly from the filesystem or from a different static server, those API calls will go to the wrong origin.

## Fixes Applied

1. Changed `.env` from `PORT=3000` to `PORT=3001` so `npm start` uses an available local port.
2. Added a startup error handler in `server.js` so port conflicts produce a clear message instead of an unclear crash.
3. Updated `test_e2e.js` to use `.env` for the app port and MySQL credentials.
4. Fixed `test_e2e.js` to use a real seller/buyer flow. The previous test created a product as one user and then tried to add that same user's product to their own cart, but the app correctly blocks self-purchases.
5. Added `.gitignore` entries for `node_modules/`, `.env`, logs, and `.DS_Store`.

## Verification Results

With UniMart running on `http://localhost:3001`, the auth flow passed:

```text
POST /api/auth/register -> 201
POST /api/auth/login    -> 200
GET  /api/auth/check    -> 200 loggedIn=true
GET  /api/users/profile -> 200
```

## How To Run

Start the server:

```bash
npm start
```

Then open:

```text
http://localhost:3001
```

Do not use `http://localhost:3000` while another process owns that port.

## Remaining Notes

- `.env` is now ignored for future commits, but if it was already tracked by Git, it must be removed from tracking with:

```bash
git rm --cached .env
```

Only do that when you are ready to commit the change.

- **Admin password**: The admin seed account password is `admin` (lowercase). The login supports both email (`admin@unimart.ae`) and username (`Admin`).
- **Student passwords**: The seed student accounts (`ahmed@hct.ac.ae`, `sara@hct.ac.ae`) use password `password123`.

## Follow-up System Pass

Additional review found and fixed these issues:

1. Product sanitization stripped HTML but validated the original unsanitized title/description. HTML-only product titles could be saved as empty strings. Validation now uses sanitized values.
2. Product image URLs accepted any string. The API now keeps only `http` and `https` URLs up to the database column length and stores invalid values as `NULL`.
3. Product category IDs were only checked for numeric shape. Create/update now verifies the category exists before writing.
4. Product and order ID route params now reject invalid IDs with `400` instead of relying on database behavior.
5. Login now regenerates and saves the session before returning, reducing session fixation risk and making session persistence explicit.
6. Admin product listing now requests all products, including sold items, instead of reusing the public available-only catalog response.
7. `test_e2e.js` now exits non-zero on test failure and deletes its created order, product, and users by exact IDs.
8. `db/schema.sql` no longer uses hardcoded seller/category IDs for sample products, and product seeding is now safe to rerun without creating duplicate sample products.

Verification after these fixes:

```text
npm test -> passed
Admin login -> passed
Invalid product ID -> 400
HTML-only product title -> 400
Invalid product category -> 400
```

The local database cleanup removed old e2e users/orders and unreferenced duplicate seed products. One duplicate-looking sample product group remains because one row is `sold`; it may be tied to order history and was left intact rather than deleting historical data.
