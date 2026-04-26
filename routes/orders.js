/*
 * Order Routes
 * Issues fixed: #8 (mark products as sold), #12 (N+1 query),
 *               #9 (prevent ordering own products)
 */
const express = require('express');
const router = express.Router();
const db = require('../db/connection');

function parsePositiveInt(value) {
    const num = Number.parseInt(value, 10);
    return Number.isInteger(num) && num > 0 ? num : null;
}

// POST /api/orders — place order from cart
router.post('/', async (req, res) => {
    // Validate inputs before acquiring a connection to avoid leaks
        const address = String(req.body.address || '').trim();
        const phone = String(req.body.phone || '').trim();
        if (!address || !phone) {
            return res.status(400).json({ error: 'Address and phone are required.' });
        }
        if (address.length < 5) {
            return res.status(400).json({ error: 'Please provide a valid address.' });
        }
        if (!/^[0-9]{10,}$/.test(phone)) {
            return res.status(400).json({ error: 'Please provide a valid phone number.' });
        }

    let connection;
    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        // Get cart items with product details
        const [cartItems] = await connection.query(
            `SELECT ci.*, p.price, p.title, p.status, p.seller_id FROM cart_items ci 
       JOIN products p ON ci.product_id = p.id 
       WHERE ci.user_id = ?`,
            [req.session.user.id]
        );

        if (cartItems.length === 0) {
            await connection.rollback();
            return res.status(400).json({ error: 'Cart is empty.' });
        }

        // Issue #9: Check none of the products belong to the buyer
        const ownProducts = cartItems.filter(item => item.seller_id === req.session.user.id);
        if (ownProducts.length > 0) {
            await connection.rollback();
            return res.status(400).json({ error: 'You cannot purchase your own products. Please remove them from your cart.' });
        }

        // Issue #11: Check all items still available
        const unavailable = cartItems.filter(item => item.status !== 'available');
        if (unavailable.length > 0) {
            await connection.rollback();
            return res.status(400).json({
                error: `Some items are no longer available: ${unavailable.map(i => i.title).join(', ')}`
            });
        }

        // Calculate total
        const totalPrice = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

        // Create order
        const [orderResult] = await connection.query(
            'INSERT INTO orders (buyer_id, total_price, address, phone) VALUES (?, ?, ?, ?)',
            [req.session.user.id, totalPrice, address, phone]
        );
        const orderId = orderResult.insertId;

        // Create order items
        for (const item of cartItems) {
            await connection.query(
                'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
                [orderId, item.product_id, item.quantity, item.price]
            );
        }

        // Issue #8: Mark products as sold
        const productIds = cartItems.map(item => item.product_id);
        if (productIds.length > 0) {
            await connection.query(
                `UPDATE products SET status = 'sold' WHERE id IN (${productIds.map(() => '?').join(',')})`,
                productIds
            );
        }

        // Clear cart
        await connection.query('DELETE FROM cart_items WHERE user_id = ?', [req.session.user.id]);

        // Also remove these products from OTHER users' carts since they're now sold
        if (productIds.length > 0) {
            await connection.query(
                `DELETE FROM cart_items WHERE product_id IN (${productIds.map(() => '?').join(',')})`,
                productIds
            );
        }

        await connection.commit();
        res.status(201).json({ message: 'Order placed successfully!', orderId });
    } catch (err) {
        if (connection) {
            try { await connection.rollback(); } catch (_) { /* ignore rollback error */ }
        }
        console.error('Order error:', err);
        res.status(500).json({ error: 'Failed to place order.' });
    } finally {
        if (connection) connection.release();
    }
});

// GET /api/orders — get user's order history
// Issue #12: Fixed N+1 query — use single JOIN query instead of loop
router.get('/', async (req, res) => {
    try {
        let orderSql, orderParams;

        if (req.session.user.is_admin) {
            orderSql = `SELECT * FROM orders ORDER BY created_at DESC`;
            orderParams = [];
        } else {
            orderSql = `SELECT * FROM orders WHERE buyer_id = ? ORDER BY created_at DESC`;
            orderParams = [req.session.user.id];
        }

        const [orders] = await db.query(orderSql, orderParams);

        if (orders.length === 0) {
            return res.json([]);
        }

        // Issue #12 FIX: Fetch ALL order items in a single query
        // Use LEFT JOIN so items remain visible even if the product was deleted
        const orderIds = orders.map(o => o.id);
        const [allItems] = await db.query(
            `SELECT oi.*, COALESCE(p.title, 'Deleted Product') AS title, p.image_url FROM order_items oi
       LEFT JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id IN (${orderIds.map(() => '?').join(',')})`,
            orderIds
        );

        // Group items by order_id
        const itemsByOrder = {};
        allItems.forEach(item => {
            if (!itemsByOrder[item.order_id]) itemsByOrder[item.order_id] = [];
            itemsByOrder[item.order_id].push(item);
        });

        // Attach items to orders
        orders.forEach(order => {
            order.items = itemsByOrder[order.id] || [];
        });

        res.json(orders);
    } catch (err) {
        console.error('Order history error:', err);
        res.status(500).json({ error: 'Failed to fetch orders.' });
    }
});

// DELETE /api/orders/:id — delete any order (admin only)
router.delete('/:id', async (req, res) => {
    try {
        if (!req.session.user.is_admin) {
            return res.status(403).json({ error: 'Admin access required.' });
        }

        const orderId = parsePositiveInt(req.params.id);
        if (!orderId) {
            return res.status(400).json({ error: 'Invalid order ID.' });
        }
        const [existing] = await db.query('SELECT id FROM orders WHERE id = ?', [orderId]);
        if (existing.length === 0) return res.status(404).json({ error: 'Order not found.' });

        await db.query('DELETE FROM orders WHERE id = ?', [orderId]);
        res.json({ message: 'Order deleted successfully.' });
    } catch (err) {
        console.error('Order delete error:', err);
        res.status(500).json({ error: 'Failed to delete order.' });
    }
});

module.exports = router;
