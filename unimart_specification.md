# UniMart — Campus Marketplace | Full Technical Specification

## 1. Project Overview

**UniMart** is a full-stack campus marketplace where university students can buy and sell second-hand items (textbooks, electronics, stationery, etc.). It is built with:

- **Front-end**: HTML5, CSS3, Bootstrap 5, JavaScript, jQuery
- **Back-end**: Node.js + Express.js
- **Database**: MySQL
- **Auth**: Server-side sessions + cookies

---

## 2. Project File Structure

```
UniMart/
├── server.js                  # Express server entry point
├── package.json               # Node.js dependencies
├── .env                       # DB credentials (not committed)
│
├── routes/
│   ├── auth.js                # Login, register, logout routes
│   ├── products.js            # CRUD routes for products
│   ├── cart.js                # Cart management routes
│   ├── orders.js              # Checkout & order history routes
│   └── users.js               # Profile update routes
│
├── public/                    # Static assets (served by Express)
│   ├── css/
│   │   └── style.css          # Custom styles (on top of Bootstrap)
│   ├── js/
│   │   ├── main.js            # Shared JS (navbar, utilities)
│   │   ├── validation.js      # Client-side form validation
│   │   ├── cart.js            # Cart jQuery interactions
│   │   └── catalog.js         # Search/filter functionality
│   ├── images/                # Static images (logo, placeholders)
│   ├── index.html             # Home Page
│   ├── login.html             # Login Page
│   ├── register.html          # Registration Page
│   ├── welcome.html           # Welcome Dashboard
│   ├── catalog.html           # Product Catalog
│   ├── product-detail.html    # Product Detail
│   ├── cart.html              # Shopping Cart
│   ├── checkout.html          # Checkout
│   ├── my-listings.html       # My Listings (CRUD)
│   └── profile.html           # User Profile
│
├── db/
│   └── schema.sql             # MySQL schema (CREATE TABLE statements)
│
└── README.md
```

---

## 3. Database Schema (MySQL)

### 3.1 Entity Relationship Diagram

```
┌──────────────┐     1:M     ┌──────────────┐
│   categories │────────────>│   products   │
└──────────────┘             └──────┬───────┘
                                    │
┌──────────────┐     1:M           │ M:1
│    users     │───────────────────┘
│              │──┐
└──────────────┘  │  1:M     ┌──────────────┐     1:M     ┌──────────────┐
                  └─────────>│    orders    │────────────>│ order_items  │
                             └──────────────┘             └──────────────┘
                  1:M                                           │
┌──────────────┐                                               │ M:1
│    users     │──────────────────────────────────────(products)┘
│    (cart)    │  1:M     ┌──────────────┐
│              │─────────>│  cart_items   │
└──────────────┘          └──────────────┘
```

### 3.2 Tables

#### `users`
| Column     | Type         | Constraints              |
|-----------|-------------|--------------------------|
| id        | INT          | PK, AUTO_INCREMENT       |
| name      | VARCHAR(100) | NOT NULL                 |
| email     | VARCHAR(100) | NOT NULL, UNIQUE         |
| password  | VARCHAR(255) | NOT NULL (hashed)        |
| phone     | VARCHAR(20)  | NULL                     |
| address   | TEXT         | NULL                     |
| created_at| TIMESTAMP    | DEFAULT CURRENT_TIMESTAMP|

#### `categories`
| Column     | Type         | Constraints              |
|-----------|-------------|--------------------------|
| id        | INT          | PK, AUTO_INCREMENT       |
| name      | VARCHAR(50)  | NOT NULL, UNIQUE         |

#### `products`
| Column      | Type          | Constraints              |
|------------|--------------|--------------------------|
| id         | INT           | PK, AUTO_INCREMENT       |
| seller_id  | INT           | FK → users(id)           |
| category_id| INT           | FK → categories(id)      |
| title      | VARCHAR(150)  | NOT NULL                 |
| description| TEXT          | NOT NULL                 |
| price      | DECIMAL(10,2) | NOT NULL                 |
| image_url  | VARCHAR(255)  | NULL                     |
| status     | ENUM('available','sold') | DEFAULT 'available' |
| created_at | TIMESTAMP     | DEFAULT CURRENT_TIMESTAMP|

#### `orders`
| Column      | Type          | Constraints              |
|------------|--------------|--------------------------|
| id         | INT           | PK, AUTO_INCREMENT       |
| buyer_id   | INT           | FK → users(id)           |
| total_price| DECIMAL(10,2) | NOT NULL                 |
| address    | TEXT          | NOT NULL                 |
| status     | ENUM('pending','completed','cancelled') | DEFAULT 'pending' |
| created_at | TIMESTAMP     | DEFAULT CURRENT_TIMESTAMP|

#### `order_items`
| Column      | Type          | Constraints              |
|------------|--------------|--------------------------|
| id         | INT           | PK, AUTO_INCREMENT       |
| order_id   | INT           | FK → orders(id)          |
| product_id | INT           | FK → products(id)        |
| quantity   | INT           | NOT NULL, DEFAULT 1      |
| price      | DECIMAL(10,2) | NOT NULL                 |

#### `cart_items`
| Column      | Type          | Constraints              |
|------------|--------------|--------------------------|
| id         | INT           | PK, AUTO_INCREMENT       |
| user_id    | INT           | FK → users(id)           |
| product_id | INT           | FK → products(id)        |
| quantity   | INT           | NOT NULL, DEFAULT 1      |

---

## 4. Page-by-Page Specification

### 4.1 Home Page (`index.html`)
- **Purpose**: Landing page introducing UniMart
- **Layout**: Full-width hero banner with tagline + CTA buttons → Login / Register
- **Content**: Featured products grid (3-4 items pulled from DB), footer with about text
- **Bootstrap**: Navbar, Jumbotron/Hero, Card grid, Footer
- **JS**: Smooth scroll, animated hero entrance

### 4.2 Login Page (`login.html`)
- **Purpose**: Authenticate existing users
- **Form Fields**: Email, Password
- **Validation (JS)**: Required fields, email format check
- **Server Behavior**: POST → `/api/auth/login` → create session → redirect to `/welcome.html`
- **Error Display**: jQuery shows inline error message on invalid credentials

### 4.3 Registration Page (`register.html`)
- **Purpose**: Create a new user account
- **Form Fields**: Full Name, Email, Password, Confirm Password, Phone (optional)
- **Validation (JS)**: All required, email regex, password min 6 chars, passwords match
- **Server Behavior**: POST → `/api/auth/register` → hash password → insert into `users` → redirect to login
- **jQuery**: Real-time password match indicator

### 4.4 Welcome Dashboard (`welcome.html`)
- **Purpose**: Post-login landing page
- **Content**: "Welcome, [Name]!" greeting, quick stat cards (My Listings count, My Orders count), navigation buttons to all sections
- **Protected**: Session check required (server middleware)
- **jQuery**: Fetch user stats via AJAX on page load

### 4.5 Product Catalog (`catalog.html`)
- **Purpose**: Browse all available products
- **Layout**: Sidebar with category filter + main area with product card grid
- **Features**: Category dropdown filter, keyword search bar, sort by price
- **Data Source**: GET `/api/products?category=X&search=Y` → returns JSON
- **jQuery**: Dynamic filtering without page reload, card rendering from JSON

### 4.6 Product Detail (`product-detail.html`)
- **Purpose**: Show full details of a single product
- **Content**: Large image, title, price, description, category badge, seller name, "Add to Cart" button
- **Data Source**: GET `/api/products/:id` → returns JSON
- **jQuery**: Add-to-cart AJAX call with success toast notification

### 4.7 Cart Page (`cart.html`)
- **Purpose**: Review items before checkout
- **Layout**: Table of cart items with image, name, price, quantity selector, subtotal, remove button
- **Footer**: Total price calculation, "Proceed to Checkout" button
- **jQuery**: Quantity +/- buttons update subtotal dynamically, remove item with animation, total auto-recalculates
- **Data Source**: GET `/api/cart` ; PUT `/api/cart/:id` ; DELETE `/api/cart/:id`

### 4.8 Checkout Page (`checkout.html`)
- **Purpose**: Finalize order
- **Content**: Order summary (read-only cart items + total), delivery address form, confirm button
- **Validation**: Address required, phone required
- **Server Behavior**: POST `/api/orders` → create order + order_items → clear cart → show confirmation
- **jQuery**: Confirmation modal on success

### 4.9 My Listings Page (`my-listings.html`)
- **Purpose**: Manage own posted products (full CRUD)
- **Layout**: Table or card grid of user's products with Edit/Delete buttons, "Post New Item" button
- **Features**:
  - **Create**: Modal form to add new product (title, desc, price, category, image URL)
  - **Read**: List all user's products
  - **Update**: Edit modal pre-filled with existing data
  - **Delete**: Confirm dialog → DELETE `/api/products/:id`
- **jQuery**: Modal forms, dynamic table updates, delete confirmation

### 4.10 Profile Page (`profile.html`)
- **Purpose**: View and edit user info
- **Form Fields**: Name, Email (read-only), Phone, Address
- **Server Behavior**: GET `/api/users/profile` ; PUT `/api/users/profile`
- **jQuery**: Toggle between view mode and edit mode

---

## 5. API Routes Summary

| Method | Route                   | Description                      | Auth Required |
|--------|------------------------|----------------------------------|:------------:|
| POST   | `/api/auth/register`   | Create new user                  | No           |
| POST   | `/api/auth/login`      | Login, create session            | No           |
| POST   | `/api/auth/logout`     | Destroy session                  | Yes          |
| GET    | `/api/users/profile`   | Get current user info            | Yes          |
| PUT    | `/api/users/profile`   | Update current user info         | Yes          |
| GET    | `/api/products`        | List all products (with filters) | No           |
| GET    | `/api/products/:id`    | Get single product               | No           |
| POST   | `/api/products`        | Create new product listing       | Yes          |
| PUT    | `/api/products/:id`    | Update own product               | Yes          |
| DELETE | `/api/products/:id`    | Delete own product               | Yes          |
| GET    | `/api/cart`            | Get current user's cart          | Yes          |
| POST   | `/api/cart`            | Add item to cart                 | Yes          |
| PUT    | `/api/cart/:id`        | Update cart item quantity         | Yes          |
| DELETE | `/api/cart/:id`        | Remove item from cart            | Yes          |
| POST   | `/api/orders`          | Place order from cart            | Yes          |
| GET    | `/api/orders`          | Get user's order history         | Yes          |
| GET    | `/api/categories`      | List all categories              | No           |

---

## 6. Key Technologies per Requirement

| Requirement | Technology Used |
|------------|----------------|
| Page structure | HTML5 semantic elements |
| Styling | CSS3 + Bootstrap 5 grid/components |
| Responsiveness | Bootstrap grid + media queries |
| Interactivity | JavaScript + jQuery (DOM manipulation, AJAX, animations) |
| Form validation | JavaScript (regex, required checks, feedback) |
| Server | Node.js + Express.js |
| Routing | Express Router (modular route files) |
| Sessions | express-session + cookie-parser |
| Database | MySQL with mysql2 package |
| Password hashing | bcryptjs |

---

## 7. Development Steps

| Step | What to Build | Test Criteria |
|------|--------------|---------------|
| 1 | Project scaffolding + npm init + Express hello world | Server starts, shows "Hello" at localhost:3000 |
| 2 | Home page HTML/CSS/Bootstrap | Page renders responsively in browser |
| 3 | Login + Register pages + client-side validation | Forms validate correctly, errors show |
| 4 | Express static serving + basic routes | HTML pages load from server |
| 5 | MySQL schema + seed data | Tables created, sample data queryable |
| 6 | Auth routes (register/login/logout + sessions) | Can register, login, see session, logout |
| 7 | Product catalog + detail pages + API | Products load from DB, detail page works |
| 8 | Cart page + cart API routes | Add/remove/update cart items works |
| 9 | Checkout + order history | Orders saved to DB, history displays |
| 10 | My Listings CRUD + Profile + Welcome dashboard | Full CRUD works, dashboard shows stats |
