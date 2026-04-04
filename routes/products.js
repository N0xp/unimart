/*
 * Product Routes — CRUD
 * Issues fixed: #9 (self-purchase prevented at cart level), #13 (admin delete),
 *               #27 (shared middleware), #28 (input validation)
 */
const express = require('express');
const router = express.Router();
const db = require('../db/connection');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { validateProduct } = require('../middleware/sanitize');

// GET /api/products — list all (with optional filters)
router.get('/', async (req, res) => {
    try {
        const { category, search, sort } = req.query;
        let sql = `SELECT p.*, c.name AS category_name, u.name AS seller_name 
               FROM products p 
               JOIN categories c ON p.category_id = c.id 
               JOIN users u ON p.seller_id = u.id 
               WHERE p.status = 'available'`;
        const params = [];

        if (category && category !== 'all') {
            sql += ' AND p.category_id = ?';
            params.push(parseInt(category));
        }
        if (search) {
            sql += ' AND (p.title LIKE ? OR p.description LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }
        if (sort === 'price_asc') {
            sql += ' ORDER BY p.price ASC';
        } else if (sort === 'price_desc') {
            sql += ' ORDER BY p.price DESC';
        } else {
            sql += ' ORDER BY p.created_at DESC';
        }

        const [rows] = await db.query(sql, params);
        res.json(rows);
    } catch (err) {
        console.error('Products list error:', err);
        res.status(500).json({ error: 'Failed to fetch products.' });
    }
});

// GET /api/products/user/mine — get current user's listings
// MUST be defined before /:id to prevent 'user' matching as an id param
router.get('/user/mine', requireAuth, async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT p.*, c.name AS category_name FROM products p 
       JOIN categories c ON p.category_id = c.id 
       WHERE p.seller_id = ? ORDER BY p.created_at DESC`,
            [req.session.user.id]
        );
        res.json(rows);
    } catch (err) {
        console.error('My listings error:', err);
        res.status(500).json({ error: 'Failed to fetch your listings.' });
    }
});

// GET /api/products/:id — single product
router.get('/:id', async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT p.*, c.name AS category_name, u.name AS seller_name, u.email AS seller_email
       FROM products p 
       JOIN categories c ON p.category_id = c.id 
       JOIN users u ON p.seller_id = u.id 
       WHERE p.id = ?`,
            [req.params.id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Product not found.' });
        }
        res.json(rows[0]);
    } catch (err) {
        console.error('Product detail error:', err);
        res.status(500).json({ error: 'Failed to fetch product.' });
    }
});

// POST /api/products — create new listing (auth required, validated)
router.post('/', requireAuth, validateProduct, async (req, res) => {
    try {
        const { title, description, price, category_id, image_url } = req.body;
        const [result] = await db.query(
            'INSERT INTO products (seller_id, category_id, title, description, price, image_url) VALUES (?, ?, ?, ?, ?, ?)',
            [req.session.user.id, category_id, title, description, price, image_url || null]
        );
        res.status(201).json({ message: 'Product listed successfully.', productId: result.insertId });
    } catch (err) {
        console.error('Product create error:', err);
        res.status(500).json({ error: 'Failed to create product.' });
    }
});

// PUT /api/products/:id — update own product (auth required, validated)
router.put('/:id', requireAuth, validateProduct, async (req, res) => {
    try {
        // Verify ownership
        const [existing] = await db.query('SELECT seller_id FROM products WHERE id = ?', [req.params.id]);
        if (existing.length === 0) return res.status(404).json({ error: 'Product not found.' });
        if (existing[0].seller_id !== req.session.user.id && !req.session.user.is_admin) {
            return res.status(403).json({ error: 'You can only edit your own listings.' });
        }
        const { title, description, price, category_id, image_url, status } = req.body;
        await db.query(
            'UPDATE products SET title=?, description=?, price=?, category_id=?, image_url=?, status=? WHERE id=?',
            [title, description, price, category_id, image_url, status || 'available', req.params.id]
        );
        res.json({ message: 'Product updated successfully.' });
    } catch (err) {
        console.error('Product update error:', err);
        res.status(500).json({ error: 'Failed to update product.' });
    }
});

// DELETE /api/products/:id — delete own product or admin delete
router.delete('/:id', requireAuth, async (req, res) => {
    try {
        const [existing] = await db.query('SELECT seller_id FROM products WHERE id = ?', [req.params.id]);
        if (existing.length === 0) return res.status(404).json({ error: 'Product not found.' });
        if (existing[0].seller_id !== req.session.user.id && !req.session.user.is_admin) {
            return res.status(403).json({ error: 'You can only delete your own listings.' });
        }
        await db.query('DELETE FROM products WHERE id = ?', [req.params.id]);
        res.json({ message: 'Product deleted successfully.' });
    } catch (err) {
        console.error('Product delete error:', err);
        res.status(500).json({ error: 'Failed to delete product.' });
    }
});


module.exports = router;
