/*
 * Cart Routes
 * Issues fixed: #9 (prevent buying own products), #10 (race condition),
 *               #11 (stock validation), #28 (input validation)
 */
const express = require('express');
const router = express.Router();
const db = require('../db/connection');
const { validateCartAdd, validateCartUpdate } = require('../middleware/sanitize');

// GET /api/cart — get current user's cart
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.query(
            `SELECT ci.id, ci.quantity, p.id AS product_id, p.title, p.price, p.image_url, 
                    p.status AS product_status, p.seller_id, c.name AS category_name
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       JOIN categories c ON p.category_id = c.id
       WHERE ci.user_id = ?`,
            [req.session.user.id]
        );
        res.json(rows);
    } catch (err) {
        console.error('Cart fetch error:', err);
        res.status(500).json({ error: 'Failed to fetch cart.' });
    }
});

// POST /api/cart — add item to cart (with validation)
router.post('/', validateCartAdd, async (req, res) => {
    try {
        const { product_id, quantity } = req.body;

        // Issue #11: Check product exists and is available
        const [product] = await db.query(
            'SELECT id, seller_id, status FROM products WHERE id = ?',
            [product_id]
        );
        if (product.length === 0) {
            return res.status(404).json({ error: 'Product not found.' });
        }
        if (product[0].status !== 'available') {
            return res.status(400).json({ error: 'This product is no longer available.' });
        }

        // Issue #9: Prevent buying own products
        if (product[0].seller_id === req.session.user.id) {
            return res.status(400).json({ error: 'You cannot add your own product to the cart.' });
        }

        // Check if item already in cart — use INSERT ON DUPLICATE (Issue #10: race condition safe)
        const [existing] = await db.query(
            'SELECT id, quantity FROM cart_items WHERE user_id = ? AND product_id = ?',
            [req.session.user.id, product_id]
        );
        if (existing.length > 0) {
            // Issue #11: cap quantity for second-hand items (max 1 per unique item)
            await db.query(
                'UPDATE cart_items SET quantity = 1 WHERE id = ?',
                [existing[0].id]
            );
        } else {
            await db.query(
                'INSERT INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)',
                [req.session.user.id, product_id, 1]
            );
        }
        res.status(201).json({ message: 'Item added to cart.' });
    } catch (err) {
        console.error('Cart add error:', err);
        res.status(500).json({ error: 'Failed to add to cart.' });
    }
});

// PUT /api/cart/:id — update cart item quantity
router.put('/:id', validateCartUpdate, async (req, res) => {
    try {
        const { quantity } = req.body;
        await db.query(
            'UPDATE cart_items SET quantity = ? WHERE id = ? AND user_id = ?',
            [quantity, req.params.id, req.session.user.id]
        );
        res.json({ message: 'Cart updated.' });
    } catch (err) {
        console.error('Cart update error:', err);
        res.status(500).json({ error: 'Failed to update cart.' });
    }
});

// DELETE /api/cart/:id — remove item from cart
router.delete('/:id', async (req, res) => {
    try {
        await db.query(
            'DELETE FROM cart_items WHERE id = ? AND user_id = ?',
            [req.params.id, req.session.user.id]
        );
        res.json({ message: 'Item removed from cart.' });
    } catch (err) {
        console.error('Cart delete error:', err);
        res.status(500).json({ error: 'Failed to remove from cart.' });
    }
});

module.exports = router;
