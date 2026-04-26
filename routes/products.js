/*
 * Product Routes — CRUD
 * Issues fixed: #9 (self-purchase prevented at cart level), #13 (admin delete),
 *               #27 (shared middleware), #28 (input validation)
 */
const express = require('express');
const router = express.Router();
const db = require('../db/connection');
const { requireAuth } = require('../middleware/auth');
const { validateProduct } = require('../middleware/sanitize');

function parsePositiveInt(value) {
    const num = Number.parseInt(value, 10);
    return Number.isInteger(num) && num > 0 ? num : null;
}

async function categoryExists(categoryId) {
    const [rows] = await db.query('SELECT id FROM categories WHERE id = ?', [categoryId]);
    return rows.length > 0;
}

// GET /api/products — list all (with optional filters)
router.get('/', async (req, res) => {
    try {
        const { category, search, sort } = req.query;
        let sql = `SELECT p.*, c.name AS category_name, u.name AS seller_name 
               FROM products p 
               JOIN categories c ON p.category_id = c.id 
               JOIN users u ON p.seller_id = u.id`;
        const params = [];
        const where = [];

        const includeAll = req.query.all === 'true' && req.session?.user?.is_admin;
        if (!includeAll) {
            where.push("p.status = 'available'");
        }

        if (category && category !== 'all') {
            const categoryId = parsePositiveInt(category);
            if (!categoryId) {
                return res.status(400).json({ error: 'Invalid category.' });
            }
            where.push('p.category_id = ?');
            params.push(categoryId);
        }
        if (search) {
            const cleanSearch = String(search).trim();
            if (cleanSearch) {
                where.push('(p.title LIKE ? OR p.description LIKE ?)');
                params.push(`%${cleanSearch}%`, `%${cleanSearch}%`);
            }
        }
        if (where.length > 0) {
            sql += ` WHERE ${where.join(' AND ')}`;
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
        const productId = parsePositiveInt(req.params.id);
        if (!productId) {
            return res.status(400).json({ error: 'Invalid product ID.' });
        }
        const [rows] = await db.query(
            `SELECT p.*, c.name AS category_name, u.name AS seller_name, u.email AS seller_email
       FROM products p 
       JOIN categories c ON p.category_id = c.id 
       JOIN users u ON p.seller_id = u.id 
       WHERE p.id = ?`,
            [productId]
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
        if (!(await categoryExists(category_id))) {
            return res.status(400).json({ error: 'Invalid category.' });
        }
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
        const productId = parsePositiveInt(req.params.id);
        if (!productId) {
            return res.status(400).json({ error: 'Invalid product ID.' });
        }
        // Verify ownership
        const [existing] = await db.query('SELECT seller_id FROM products WHERE id = ?', [productId]);
        if (existing.length === 0) return res.status(404).json({ error: 'Product not found.' });
        if (existing[0].seller_id !== req.session.user.id && !req.session.user.is_admin) {
            return res.status(403).json({ error: 'You can only edit your own listings.' });
        }
        const { title, description, price, category_id, image_url } = req.body;
        if (!(await categoryExists(category_id))) {
            return res.status(400).json({ error: 'Invalid category.' });
        }
        // Note: status is intentionally excluded — it should only change via order workflow
        await db.query(
            'UPDATE products SET title=?, description=?, price=?, category_id=?, image_url=? WHERE id=?',
            [title, description, price, category_id, image_url || null, productId]
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
        const productId = parsePositiveInt(req.params.id);
        if (!productId) {
            return res.status(400).json({ error: 'Invalid product ID.' });
        }
        const [existing] = await db.query('SELECT seller_id FROM products WHERE id = ?', [productId]);
        if (existing.length === 0) return res.status(404).json({ error: 'Product not found.' });
        if (existing[0].seller_id !== req.session.user.id && !req.session.user.is_admin) {
            return res.status(403).json({ error: 'You can only delete your own listings.' });
        }
        await db.query('DELETE FROM products WHERE id = ?', [productId]);
        res.json({ message: 'Product deleted successfully.' });
    } catch (err) {
        console.error('Product delete error:', err);
        res.status(500).json({ error: 'Failed to delete product.' });
    }
});


module.exports = router;
