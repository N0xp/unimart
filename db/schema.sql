-- =============================================
-- UniMart Database Schema
-- =============================================

CREATE DATABASE IF NOT EXISTS unimart;
USE unimart;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  phone VARCHAR(20) DEFAULT NULL,
  address TEXT DEFAULT NULL,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE
);

-- Products table (Issue #23: added indexes)
CREATE TABLE IF NOT EXISTS products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  seller_id INT NOT NULL,
  category_id INT NOT NULL,
  title VARCHAR(150) NOT NULL,
  description TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  image_url VARCHAR(255) DEFAULT NULL,
  status ENUM('available','sold') DEFAULT 'available',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
  INDEX idx_products_status (status),
  INDEX idx_products_seller (seller_id),
  INDEX idx_products_category (category_id),
  INDEX idx_products_created (created_at)
);

CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  buyer_id INT DEFAULT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  address TEXT NOT NULL,
  phone VARCHAR(20) NOT NULL,
  status ENUM('pending','completed','cancelled') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Order items table (Issue #24: keep order items even if product deleted)
CREATE TABLE IF NOT EXISTS order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  product_id INT DEFAULT NULL,
  quantity INT NOT NULL DEFAULT 1,
  price DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);

-- Cart items table (Issue #10: UNIQUE constraint to prevent duplicates)
CREATE TABLE IF NOT EXISTS cart_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  UNIQUE KEY unique_user_product (user_id, product_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- =============================================
-- =============================================

-- Categories
INSERT IGNORE INTO categories (name) VALUES
  ('Textbooks'),
  ('Electronics'),
  ('Stationery'),
  ('Clothing'),
  ('Sports'),
  ('Other');

-- Sample user (password: Admin = "admin", Students = "password123" — hashed with bcrypt)
INSERT IGNORE INTO users (name, email, password, phone, is_admin) VALUES
  ('Admin', 'admin@unimart.ae', '$2b$10$/Sv/mJ/Pj0pxydeEKqBcm.18uwJ1Cj.BO6uu80JP89NbVgpGLi46G', '0000000000', TRUE),
  ('Ahmed Ali', 'ahmed@hct.ac.ae', '$2b$10$LkZsvOxAE/T8QkussKHXZ.cmCcUmFxk.yzIQ2FF1aL8lxJAlhHAOq', '0501234567', FALSE),
  ('Sara Mohammed', 'sara@hct.ac.ae', '$2b$10$LkZsvOxAE/T8QkussKHXZ.cmCcUmFxk.yzIQ2FF1aL8lxJAlhHAOq', '0507654321', FALSE);

-- Sample products
-- Use email/category lookups and NOT EXISTS so this seed can be re-run safely.
INSERT INTO products (seller_id, category_id, title, description, price, image_url)
SELECT u.id, c.id, 'Data Structures Textbook', 'Gently used Data Structures and Algorithms textbook, 3rd edition. Highlights on some pages.', 45.00, 'https://placehold.co/400x300/2563eb/ffffff?text=DS+Textbook'
FROM users u JOIN categories c ON c.name = 'Textbooks'
WHERE u.email = 'admin@unimart.ae'
  AND NOT EXISTS (SELECT 1 FROM products p WHERE p.seller_id = u.id AND p.title = 'Data Structures Textbook');

INSERT INTO products (seller_id, category_id, title, description, price, image_url)
SELECT u.id, c.id, 'TI-84 Calculator', 'Texas Instruments TI-84 Plus graphing calculator. Works perfectly, includes batteries.', 65.00, 'https://placehold.co/400x300/7c3aed/ffffff?text=Calculator'
FROM users u JOIN categories c ON c.name = 'Electronics'
WHERE u.email = 'admin@unimart.ae'
  AND NOT EXISTS (SELECT 1 FROM products p WHERE p.seller_id = u.id AND p.title = 'TI-84 Calculator');

INSERT INTO products (seller_id, category_id, title, description, price, image_url)
SELECT u.id, c.id, 'Calculus Early Transcendentals', 'James Stewart Calculus, 8th edition. Like new condition, no writing or highlights.', 55.00, 'https://placehold.co/400x300/059669/ffffff?text=Calculus'
FROM users u JOIN categories c ON c.name = 'Textbooks'
WHERE u.email = 'ahmed@hct.ac.ae'
  AND NOT EXISTS (SELECT 1 FROM products p WHERE p.seller_id = u.id AND p.title = 'Calculus Early Transcendentals');

INSERT INTO products (seller_id, category_id, title, description, price, image_url)
SELECT u.id, c.id, 'Notebook Bundle (5 pack)', 'Five A4 spiral notebooks, college ruled. Brand new, unopened.', 12.00, 'https://placehold.co/400x300/d97706/ffffff?text=Notebooks'
FROM users u JOIN categories c ON c.name = 'Stationery'
WHERE u.email = 'ahmed@hct.ac.ae'
  AND NOT EXISTS (SELECT 1 FROM products p WHERE p.seller_id = u.id AND p.title = 'Notebook Bundle (5 pack)');

INSERT INTO products (seller_id, category_id, title, description, price, image_url)
SELECT u.id, c.id, 'Wireless Mouse', 'Logitech M185 wireless mouse. Battery lasts 12 months, USB receiver included.', 15.00, 'https://placehold.co/400x300/dc2626/ffffff?text=Mouse'
FROM users u JOIN categories c ON c.name = 'Electronics'
WHERE u.email = 'admin@unimart.ae'
  AND NOT EXISTS (SELECT 1 FROM products p WHERE p.seller_id = u.id AND p.title = 'Wireless Mouse');

INSERT INTO products (seller_id, category_id, title, description, price, image_url)
SELECT u.id, c.id, 'HCT Hoodie Size L', 'Official HCT branded hoodie, size Large. Worn twice, like new.', 35.00, 'https://placehold.co/400x300/4f46e5/ffffff?text=Hoodie'
FROM users u JOIN categories c ON c.name = 'Clothing'
WHERE u.email = 'ahmed@hct.ac.ae'
  AND NOT EXISTS (SELECT 1 FROM products p WHERE p.seller_id = u.id AND p.title = 'HCT Hoodie Size L');
