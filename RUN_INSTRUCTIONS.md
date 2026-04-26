# UniMart — Campus Marketplace

Welcome to the UniMart project! This guide walks you through how to set up, install dependencies, and run the UniMart system on both **Windows** and **macOS**.

---

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

1. **Node.js** (v18 or higher) — [nodejs.org](https://nodejs.org/)
2. **MySQL** (v8 or higher)
   - **Windows**: [MySQL Installer](https://dev.mysql.com/downloads/installer/)
   - **macOS**: [mysql.com](https://dev.mysql.com/downloads/mysql/) or `brew install mysql`

---

## 🚀 Setup Instructions

### 1. Database Setup

Create the database and seed it with initial data.

1. Open your MySQL command line, Workbench, or any DB client.
2. Run the schema script:
   ```bash
   mysql -u root -p < db/schema.sql
   ```
   > **Note:** The schema uses `CREATE TABLE IF NOT EXISTS` and `INSERT IGNORE` so it is safe to re-run.

### 2. Environment Configuration

In the project root, open `.env` and update database credentials:
```env
PORT=3001
SESSION_SECRET=<your-random-secret-key>

# MySQL Database
DB_HOST=localhost
DB_USER=root
DB_PASS=              # ← Add your MySQL password here
DB_NAME=unimart
```

---

## 💻 Running the System

### macOS

```bash
# Navigate to project
cd /path/to/UniMart

# Install dependencies
npm install

# Start server
npm start
# or: node server.js
```

### Windows

```cmd
:: Navigate to project
cd C:\path\to\UniMart

:: Install dependencies
npm install

:: Start server
npm start
```

### ✅ Verification

After starting, you should see:
```
✅ UniMart server running at http://localhost:3001
✅ Database connected successfully.
```

Open **http://localhost:3001** in your browser.

---

## 👤 Test Accounts

| Role | Username / Email | Password |
|------|------------------|----------|
| **Admin** | `Admin` or `admin@unimart.ae` | `admin` |
| Student | `ahmed@hct.ac.ae` | `password123` |
| Student | `sara@hct.ac.ae` | `password123` |

---

## 📁 Project Structure

```
UniMart/
├── server.js              # Express server (Helmet, rate limiting, CSP, sessions)
├── .env                   # Environment variables
├── package.json           # Dependencies & scripts
├── .gitignore             # Git exclusions
├── middleware/
│   ├── auth.js            # requireAuth & requireAdmin middleware
│   └── sanitize.js        # Input validation (products, cart)
├── db/
│   ├── connection.js      # MySQL connection pool
│   └── schema.sql         # Database schema & seed data
├── routes/
│   ├── auth.js            # Register, login, logout
│   ├── products.js        # Product CRUD
│   ├── cart.js            # Cart management
│   ├── orders.js          # Order placement & history
│   └── users.js           # Profile & dashboard stats
└── public/
    ├── index.html          # Homepage (dynamic featured products)
    ├── catalog.html        # Browse & search products
    ├── product-detail.html # Single product view
    ├── cart.html            # Shopping cart
    ├── checkout.html        # Checkout & order placement
    ├── orders.html          # Order history
    ├── welcome.html         # User dashboard
    ├── my-listings.html     # Manage own listings
    ├── profile.html         # Edit profile
    ├── admin.html           # Admin dashboard (protected)
    ├── login.html           # Login form
    ├── register.html        # Registration form
    ├── navbar.html          # Shared navbar component
    ├── 404.html             # Custom 404 page
    ├── css/style.css        # Styles
    └── js/
        ├── main.js          # Auth, navbar loader, XSS sanitization
        └── validation.js    # Client-side form validation
```

---

## 🔒 Security Features

- **XSS Protection**: All user-generated content escaped via `escapeHtml()`
- **CSP Headers**: Helmet with strict Content Security Policy
- **Rate Limiting**: Auth endpoints limited to 20 requests per 15 minutes
- **CSRF Mitigation**: SameSite cookie attribute set to `lax`
- **Session Security**: HttpOnly cookies, configurable secret
- **Input Validation**: Server-side validation for products, cart, and orders
- **Admin Protection**: Server-side middleware protects admin routes

---

## 🛑 Troubleshooting

| Error | Fix |
|-------|-----|
| `ER_ACCESS_DENIED_ERROR` | Update `DB_PASS` in `.env` with your MySQL password |
| `EADDRINUSE: port 3001` | Kill existing process: `lsof -ti :3001 \| xargs kill -9` or change `PORT` in `.env` |
| `ECONNREFUSED` | Ensure MySQL server is running |
| `❌ Database connection failed` | Check `.env` credentials and MySQL service status |
